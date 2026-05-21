import fetch from 'node-fetch';
import { env } from '../src/config/env';

async function main() {
  if (!env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY not set in env');
    process.exit(1);
  }

  const recipient = process.argv[2] || 'zubair.m1815@gmail.com';
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const end = now.toISOString();

  console.log(`Querying Brevo events for ${recipient} between ${start} and ${end}`);

  const url = `https://api.brevo.com/v3/smtp/statistics/events?startDate=${encodeURIComponent(
    start
  )}&endDate=${encodeURIComponent(end)}&limit=100`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      // Filter client-side for recipient
      const events = Array.isArray(json.events) ? json.events : json;
      const filtered = (events as any[]).filter((e) => {
        try {
          return (
            (e && e.message && e.message.to && e.message.to[0] && e.message.to[0].email === recipient) ||
            e.recipient === recipient ||
            (e && JSON.stringify(e).includes(recipient))
          );
        } catch (err) {
          return false;
        }
      });

      console.log('Raw response sample:', JSON.stringify(json, null, 2).slice(0, 800));
      console.log(`Found ${filtered.length} events matching ${recipient}:`);
      console.log(JSON.stringify(filtered, null, 2));
    } catch (err) {
      console.error('Failed to parse JSON response:', text);
    }
  } catch (error) {
    console.error('Brevo API request failed:', error);
  }
}

main().catch((err) => {
  console.error('Script error', err);
  process.exit(2);
});
