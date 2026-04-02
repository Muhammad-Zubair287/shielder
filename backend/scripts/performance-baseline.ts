/**
 * Performance baseline script for key API endpoints/pages.
 *
 * Usage:
 *   npm run perf:baseline
 *
 * Optional env vars:
 *   FRONTEND_BASE_URL=http://localhost:3000
 *   PERF_ITERATIONS=20
 *   PERF_WARMUP=3
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import request = require('supertest');
import { createApp } from '../src/app';

type EndpointTarget = {
  name: string;
  method: 'get' | 'post';
  path: string;
  body?: Record<string, unknown>;
  acceptedStatus: number[];
};

type LatencyStats = {
  minMs: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  successRate: string;
};

type EndpointResult = {
  name: string;
  method: string;
  path: string;
  stats: LatencyStats;
  samples: number;
};

type FrontendPageResult = {
  page: string;
  status: number;
  latencyMs: number;
  ok: boolean;
};

const ENDPOINTS: EndpointTarget[] = [
  {
    name: 'Health Check',
    method: 'get',
    path: '/health',
    acceptedStatus: [200],
  },
  {
    name: 'Route Debug',
    method: 'get',
    path: '/api/debug-routes',
    acceptedStatus: [200],
  },
  {
    name: 'Products List',
    method: 'get',
    path: '/api/inventory/products?page=1&limit=10',
    acceptedStatus: [200],
  },
  {
    name: 'Products Filters Meta',
    method: 'get',
    path: '/api/inventory/products/filters',
    acceptedStatus: [200],
  },
  {
    name: 'Auth Login Validation Path',
    method: 'post',
    path: '/api/auth/login',
    body: { email: 'invalid', password: 'short' },
    acceptedStatus: [400, 401, 422, 429],
  },
  {
    name: 'Contact Validation Path',
    method: 'post',
    path: '/api/contact',
    body: {
      firstName: 'Perf',
      lastName: 'Probe',
      email: 'invalid',
      phone: '000',
      subject: 'General Inquiry',
      message: 'Benchmark payload',
      captchaToken: 'invalid-token',
    },
    acceptedStatus: [400, 422],
  },
];

const FRONTEND_PAGES = ['/home', '/products', '/contact'];

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, idx)];
}

function buildStats(samplesMs: number[], successes: number): LatencyStats {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const total = samplesMs.reduce((acc, value) => acc + value, 0);
  const avg = samplesMs.length ? total / samplesMs.length : 0;

  return {
    minMs: sorted[0] ?? 0,
    avgMs: Number(avg.toFixed(2)),
    p95Ms: percentile(sorted, 95),
    maxMs: sorted[sorted.length - 1] ?? 0,
    successRate: `${((successes / Math.max(1, samplesMs.length)) * 100).toFixed(1)}%`,
  };
}

async function benchmarkEndpoint(
  app: ReturnType<typeof createApp>,
  target: EndpointTarget,
  warmup: number,
  iterations: number
): Promise<EndpointResult> {
  const allDurations: number[] = [];
  let successCount = 0;

  const runRequest = async (): Promise<{ elapsed: number; isSuccess: boolean }> => {
    const start = Date.now();
    const req = request(app)[target.method](target.path);
    if (target.body) {
      req.send(target.body);
    }
    const response = await req;
    const elapsed = Date.now() - start;

    return {
      elapsed,
      isSuccess: target.acceptedStatus.includes(response.status),
    };
  };

  for (let i = 0; i < warmup; i += 1) {
    await runRequest();
  }

  for (let i = 0; i < iterations; i += 1) {
    const result = await runRequest();
    allDurations.push(result.elapsed);
    if (result.isSuccess) {
      successCount += 1;
    }
  }

  return {
    name: target.name,
    method: target.method.toUpperCase(),
    path: target.path,
    samples: iterations,
    stats: buildStats(allDurations, successCount),
  };
}

async function benchmarkFrontendPages(baseUrl?: string): Promise<FrontendPageResult[]> {
  if (!baseUrl) {
    return [];
  }

  const results: FrontendPageResult[] = [];

  for (const page of FRONTEND_PAGES) {
    const start = Date.now();
    try {
      const response = await fetch(`${baseUrl}${page}`);
      results.push({
        page,
        status: response.status,
        latencyMs: Date.now() - start,
        ok: response.ok,
      });
    } catch {
      results.push({
        page,
        status: 0,
        latencyMs: Date.now() - start,
        ok: false,
      });
    }
  }

  return results;
}

function endpointTable(results: EndpointResult[]): string {
  const header =
    '| Endpoint | Method | Samples | Min (ms) | Avg (ms) | P95 (ms) | Max (ms) | Success Rate |\n' +
    '|---|---|---:|---:|---:|---:|---:|---:|\n';

  const rows = results
    .map((r) => {
      return `| ${r.name} (${r.path}) | ${r.method} | ${r.samples} | ${r.stats.minMs} | ${r.stats.avgMs} | ${r.stats.p95Ms} | ${r.stats.maxMs} | ${r.stats.successRate} |`;
    })
    .join('\n');

  return `${header}${rows}`;
}

function frontendTable(results: FrontendPageResult[]): string {
  const header =
    '| Page | Status | Latency (ms) | Reachable |\n' +
    '|---|---:|---:|---|\n';

  const rows = results
    .map((r) => `| ${r.page} | ${r.status} | ${r.latencyMs} | ${r.ok ? 'yes' : 'no'} |`)
    .join('\n');

  return `${header}${rows}`;
}

async function main(): Promise<void> {
  const app = createApp();
  const warmup = Number(process.env.PERF_WARMUP ?? 3);
  const iterations = Number(process.env.PERF_ITERATIONS ?? 20);
  const frontendBaseUrl = process.env.FRONTEND_BASE_URL;

  const endpointResults: EndpointResult[] = [];
  for (const endpoint of ENDPOINTS) {
    endpointResults.push(await benchmarkEndpoint(app, endpoint, warmup, iterations));
  }

  const frontendResults = await benchmarkFrontendPages(frontendBaseUrl);

  const timestamp = new Date().toISOString();
  const markdownParts = [
    '# Performance Baseline Report',
    '',
    `Generated: ${timestamp}`,
    '',
    '## Backend Endpoint Baseline',
    '',
    `Warmup requests per endpoint: ${warmup}`,
    `Measured requests per endpoint: ${iterations}`,
    '',
    endpointTable(endpointResults),
  ];

  if (frontendBaseUrl) {
    markdownParts.push(
      '',
      '## Frontend Page Reachability Snapshot',
      '',
      `Base URL: ${frontendBaseUrl}`,
      '',
      frontendTable(frontendResults)
    );
  } else {
    markdownParts.push(
      '',
      '## Frontend Page Reachability Snapshot',
      '',
      'Skipped. Set FRONTEND_BASE_URL to include frontend page timing.'
    );
  }

  const report = `${markdownParts.join('\n')}\n`;
  const outputPath = path.resolve(process.cwd(), 'PERFORMANCE_BASELINE.md');
  await fs.writeFile(outputPath, report, 'utf-8');

  // Keep terminal summary compact for CI or local runs.
  console.log(`Performance baseline complete. Report written to ${outputPath}`);
}

main().catch((error) => {
  console.error('Performance baseline failed:', error);
  process.exit(1);
});
