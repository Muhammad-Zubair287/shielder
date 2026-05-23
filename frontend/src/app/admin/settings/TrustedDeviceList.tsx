'use client';

import React, { useEffect, useState } from 'react';
import authService from '@/services/auth.service';
import { toast } from 'react-hot-toast';

export default function TrustedDeviceList() {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const d = await authService.getTrustedDevices();
      setDevices(d || []);
    } catch (err) {
      toast.error('Failed to load trusted devices');
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  const revoke = async (token: string) => {
    try {
      await authService.revokeTrustedDevice(token);
      toast.success('Trusted device revoked');
      fetchDevices();
    } catch (err) {
      toast.error('Failed to revoke device');
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Loading devices...</div>;
  if (!devices.length) return <div className="text-sm text-gray-500">No trusted devices remembered.</div>;

  return (
    <div className="space-y-2">
      {devices.map((d) => (
        <div key={d.id || d.token} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-3">
          <div>
            <div className="text-sm font-bold text-shielder-dark">{d.name || d.deviceInfo || 'Unnamed device'}</div>
            <div className="text-xs text-gray-500">{d.ipAddress ? `${d.ipAddress} · ` : ''}{d.deviceInfo}</div>
            <div className="text-xs text-gray-400">Added {d.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400 mr-3">Expires {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</div>
            <button
              onClick={() => revoke(d.token)}
              className="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-semibold border border-red-100 hover:bg-red-100"
            >
              Revoke
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
