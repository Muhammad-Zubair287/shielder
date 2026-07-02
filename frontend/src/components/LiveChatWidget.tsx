'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, X, Phone, Mail, FileText } from 'lucide-react';
import { usePathname } from 'next/navigation';

/**
 * Lightweight live chat widget for home/contact surfaces.
 * Uses safe links (WhatsApp, contact form, phone) without altering backend contracts.
 */
export default function LiveChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const shouldShow = useMemo(() => {
    return pathname === '/home' || pathname === '/contact';
  }, [pathname]);

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-9 right-6 z-[70]">
      {open && (
        <div className="mb-3 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-fade-in">
          <div className="bg-[#0205A6] text-white px-4 py-3">
            <p className="font-semibold text-sm">Live Support</p>
            <p className="text-xs text-blue-100">We are here to help you quickly.</p>
          </div>

          <div className="p-3 space-y-2">
            <a
              href="https://wa.me/966506814416"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <MessageCircle size={16} className="text-green-600" />
              Chat on WhatsApp
            </a>

            <a
              href="tel:+966506814416"
              className="w-full flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Phone size={16} className="text-[#0205A6]" />
              Call Support
            </a>

            <a
              href="mailto:info@shielder.sa"
              className="w-full flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Mail size={16} className="text-[#0205A6]" />
              Email Support
            </a>

            <Link
              href="/contact"
              className="w-full flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText size={16} className="text-[#0205A6]" />
              Open Contact Form
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close live chat widget' : 'Open live chat widget'}
        className="h-14 w-14 rounded-full bg-[#0205A6] hover:bg-[#0103d4] text-white shadow-2xl flex items-center justify-center transition-colors"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
