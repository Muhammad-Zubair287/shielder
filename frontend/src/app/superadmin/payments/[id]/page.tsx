'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  DollarSign, 
  Calendar, 
  User, 
  Hash, 
  CreditCard, 
  FileText, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2,
  Undo2
} from 'lucide-react';
import { paymentService, Payment } from '@/services/payment.service';
import { format } from 'date-fns';
import SARSymbol from '@/components/SARSymbol';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function PaymentDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundNotes, setRefundNotes] = useState('');
  const [showRefundConfirm, setShowRefundConfirm] = useState(false);

  useEffect(() => {
    const fetchPayment = async () => {
      try {
        setLoading(true);
        const response = await paymentService.getPaymentById(id);
        if (response.data) {
          setPayment(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch payment details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPayment();
  }, [id]);

  const handleRefund = async () => {
    try {
      setIsRefunding(true);
      await paymentService.refundPayment(id, refundNotes);
      // Refresh data
      const response = await paymentService.getPaymentById(id);
      if (response.data) {
        setPayment(response.data);
      }
      setShowRefundConfirm(false);
      setRefundNotes('');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to process refund');
    } finally {
      setIsRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-shielder-primary/20 border-t-shielder-primary rounded-full animate-spin"></div>
        <p className="text-sm font-black text-shielder-dark uppercase tracking-widest">Loading Payment...</p>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-black text-shielder-dark uppercase">Payment Not Found</h2>
        <Link href="/superadmin/payments" className="text-shielder-primary hover:underline mt-4 inline-block">Go back to Payments</Link>
      </div>
    );
  }

  const canRefund = payment.status === 'PAID';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link 
            href="/superadmin/payments"
            className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all text-gray-500 shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">Payment Info</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                payment.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200' :
                payment.status === 'PENDING' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                {payment.status}
              </span>
            </div>
            <p className="text-gray-500 text-xs font-medium mt-0.5 uppercase tracking-widest">Payment ID: {payment.transactionId || 'Internal ID'}</p>
          </div>
        </div>

        {canRefund && (
          <button 
            onClick={() => setShowRefundConfirm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
          >
            <Undo2 size={16} />
            <span>Issue Refund</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Summary */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-shielder-dark uppercase tracking-widest flex items-center space-x-2">
                <DollarSign size={18} className="text-shielder-primary" />
                <span>Payment Summary</span>
              </h3>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Paid</span>
                    <span className="text-xl font-black text-shielder-dark inline-flex items-center gap-0.5"><SARSymbol />{Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <InfoRow icon={<CreditCard size={14} />} label="Payment Method" value={payment.method.replace('_', ' ')} />
                  <InfoRow icon={<Hash size={14} />} label="Payment ID" value={payment.id} />
                  <InfoRow icon={<Calendar size={14} />} label="Payment Date" value={format(new Date(payment.createdAt), 'MMMM dd, yyyy @ HH:mm')} />
                </div>
                <div className="space-y-4 text-sm">
                  <div className="p-4 bg-shielder-dark rounded-2xl text-white">
                    <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">Processed By</p>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-xs">{payment.recorder?.profile?.fullName || 'System'}</p>
                        <p className="text-[10px] opacity-60">Staff Member</p>
                      </div>
                    </div>
                  </div>
                  {payment.notes && (
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest mb-1 flex items-center space-x-1">
                        <FileText size={12} />
                        <span>Notes</span>
                      </p>
                      <p className="text-xs text-orange-900 font-medium leading-relaxed">{payment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Associated Order */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50">
              <h3 className="text-sm font-black text-shielder-dark uppercase tracking-widest flex items-center space-x-2">
                <ShieldCheck size={18} className="text-shielder-secondary" />
                <span>Order Details</span>
              </h3>
            </div>
            <div className="p-8">
              <div className="flex flex-col md:flex-row justify-between gap-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Number</p>
                  <Link href={`/superadmin/orders/${payment.orderId}`} className="text-2xl font-black text-shielder-primary hover:underline">
                    {payment.order.orderNumber}
                  </Link>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-right">Customer</p>
                  <p className="text-lg font-bold text-shielder-dark text-right">{payment.order.customerName}</p>
                </div>
                <div className="bg-gray-50 px-6 py-3 rounded-2xl border border-gray-100 flex flex-col items-end justify-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Total</p>
                  <p className="text-xl font-black text-shielder-dark inline-flex items-center gap-0.5"><SARSymbol />{Number(payment.order.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Audit & Protection */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center space-x-2">
              <ShieldCheck size={14} className="text-shielder-primary" />
              <span>Payment History</span>
            </h3>
            
            <div className="space-y-6">
              <TimelineItem 
                icon={<CheckCircle2 size={12} className="text-green-500" />}
                title="Payment Recorded"
                time={format(new Date(payment.createdAt), 'HH:mm')}
                date={format(new Date(payment.createdAt), 'MMM dd')}
                description="Payment details saved."
                active
              />
              <TimelineItem 
                icon={<ShieldCheck size={12} className="text-blue-500" />}
                title="Payment Confirmed"
                time={format(new Date(payment.updatedAt), 'HH:mm')}
                date={format(new Date(payment.updatedAt), 'MMM dd')}
                description="Details cannot be changed."
              />
              {payment.status === 'REFUNDED' && (
                <TimelineItem 
                  icon={<AlertCircle size={12} className="text-red-500" />}
                  title="Refund Processed"
                  time={format(new Date(payment.updatedAt), 'HH:mm')}
                  date={format(new Date(payment.updatedAt), 'MMM dd')}
                  description="Money returned."
                  isLast
                />
              )}
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start space-x-3">
              <AlertCircle size={16} className="text-shielder-dark mt-0.5" />
              <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                This payment record is protected. Once marked as "Paid", it cannot be deleted or modified. Only refunds are allowed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-shielder-dark/60 backdrop-blur-sm" onClick={() => setShowRefundConfirm(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center space-x-3 text-red-600 mb-6">
              <div className="p-2 bg-red-50 rounded-xl">
                <AlertCircle size={24} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight">Confirm Refund</h2>
            </div>
            
            <p className="text-gray-600 text-sm font-medium mb-6">
              You are about to issue a refund for <span className="font-bold text-shielder-dark inline-flex items-center gap-0.5"><SARSymbol />{Number(payment.amount).toFixed(2)}</span>. This will update the order status and sales reports.
            </p>

            <div className="space-y-4 mb-8">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Refund</label>
              <textarea 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:outline-none text-sm font-medium"
                placeholder="e.g., Customer cancelled, Overpayment..."
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                rows={3}
              ></textarea>
            </div>

            <div className="flex space-x-4">
              <button 
                onClick={() => setShowRefundConfirm(false)}
                className="flex-1 px-6 py-4 border border-gray-200 text-gray-500 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleRefund}
                disabled={isRefunding}
                className="flex-1 px-6 py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-red-600/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isRefunding ? 'Refunding...' : 'Confirm Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between text-sm py-2">
      <div className="flex items-center space-x-2 text-gray-400">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className="font-bold text-shielder-dark text-xs uppercase tracking-tight">{value}</span>
    </div>
  );
}

function TimelineItem({ icon, title, time, date, description, active, isLast }: any) {
  return (
    <div className="flex space-x-4 relative">
      {!isLast && <div className="absolute left-[13px] top-[26px] bottom-[-20px] w-[2px] bg-gray-100"></div>}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center relative z-10 ${active ? 'bg-shielder-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <h4 className="text-[10px] font-black text-shielder-dark uppercase tracking-widest">{title}</h4>
          <div className="text-right">
            <p className="text-[10px] font-black text-shielder-dark uppercase tracking-tighter leading-none">{time}</p>
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-0.5">{date}</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
