'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { orderService } from '@/services/order.service';
import customerQuotationService from '@/services/customerQuotation.service';
import { DASHBOARD_LABELS } from '@/constants/ui.constants';
import {
  DashboardActivityItem,
  DashboardOrder,
  DashboardQuotation,
} from './dashboard.types';

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<DashboardOrder[]>([]);
  const [quotations, setQuotations] = useState<DashboardQuotation[]>([]);
  const [loading, setLoading] = useState(true);

  const recentActivity: DashboardActivityItem[] = [
    ...orders.slice(0, 3).map((order) => ({
      id: `order-${order.id}`,
      type: 'ORDER' as const,
      label: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      href: `/my-orders/${order.id}`,
    })),
    ...quotations.slice(0, 3).map((quote) => ({
      id: `quote-${quote.id}`,
      type: 'QUOTATION' as const,
      label: quote.referenceNumber,
      status: quote.status,
      createdAt: quote.createdAt,
      href: `/my-quotation/${quote.id}`,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [ordersData, quotationsData] = await Promise.all([
        orderService.getMyOrders(),
        customerQuotationService.getMyQuotations(),
      ]);
      setOrders(
        (Array.isArray(ordersData) ? ordersData : (ordersData?.orders ?? []))
          .map((o: any) => ({ ...o, total: Number(o.total ?? 0) }))
      );
      setQuotations(
        (quotationsData || []).map((quote) => ({
          id: quote.id,
          referenceNumber: quote.quotationNumber,
          status: quote.status,
          amount: Number(quote.total || 0),
          createdAt: quote.quotationDate,
        }))
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      sent: 'bg-purple-100 text-purple-800',
      viewed: 'bg-purple-50 text-purple-700',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return statusMap[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold text-shielder-dark">
                Welcome back, {user?.profile?.fullName || user?.email}
              </h1>
              <p className="text-gray-600 mt-2">Manage your orders and quotations</p>
            </div>
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="px-4 py-2 text-shielder-accent font-medium hover:underline"
            >
              Sign Out
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-gray-600 text-sm font-medium">Total Orders</div>
              <div className="text-3xl font-bold text-shielder-dark mt-2">{orders.length}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-gray-600 text-sm font-medium">Active Quotations</div>
              <div className="text-3xl font-bold text-shielder-dark mt-2">
                {quotations.filter((q) => q.status !== 'approved' && q.status !== 'rejected').length}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="text-gray-600 text-sm font-medium">Profile Completion</div>
              <div className="text-3xl font-bold text-shielder-dark mt-2">
                {user?.profile?.fullName ? '100%' : '50%'}
              </div>
            </div>
          </div>

          {/* Profile + Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-1">
              <h2 className="text-lg font-bold text-shielder-dark mb-4">Profile Summary</h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Name:</span> <span className="font-medium text-gray-900">{user?.profile?.fullName || 'Not set'}</span></p>
                <p><span className="text-gray-500">Email:</span> <span className="font-medium text-gray-900">{user?.email || 'Not set'}</span></p>
                <p><span className="text-gray-500">Phone:</span> <span className="font-medium text-gray-900">{user?.profile?.phoneNumber || 'Not set'}</span></p>
                <p><span className="text-gray-500">Address:</span> <span className="font-medium text-gray-900">{user?.profile?.address || 'Not set'}</span></p>
              </div>
              <Link href="/profile" className="inline-block mt-4 text-shielder-accent hover:underline text-sm font-medium">
                Update Profile
              </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
              <h2 className="text-lg font-bold text-shielder-dark mb-4">Recent Activity Timeline</h2>
              {recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {recentActivity.slice(0, 6).map((activity) => (
                    <Link
                      key={activity.id}
                      href={activity.href}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div>
                        <p className="text-sm font-semibold text-shielder-dark">{activity.type}: {activity.label}</p>
                        <p className="text-xs text-gray-500">{new Date(activity.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(activity.status)}`}>
                        {activity.status}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">{DASHBOARD_LABELS.NO_RECENT_ACTIVITY}</div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-shielder-dark">Recent Orders</h2>
              <Link href="/my-orders" className="text-shielder-accent hover:underline text-sm font-medium">
                View All
              </Link>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading orders...</div>
            ) : orders.length > 0 ? (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <Link
                    key={order.id}
                    href={`/my-orders/${order.id}`}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div>
                      <div className="font-medium text-shielder-dark">{order.orderNumber}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                        {order.status}
                      </span>
                      <div className="text-right">
                        <div className="font-semibold text-shielder-dark">AED {Number(order.total).toFixed(2)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No orders yet.{' '}
                <Link href="/products" className="text-shielder-accent font-medium hover:underline">
                  Start Shopping
                </Link>
              </div>
            )}
          </div>

          {/* Quotations */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-shielder-dark">Your Quotations</h2>
              <Link href="/my-quotation" className="text-shielder-accent hover:underline text-sm font-medium">
                View All
              </Link>
            </div>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading quotations...</div>
            ) : quotations.length > 0 ? (
              <div className="space-y-3">
                {quotations.slice(0, 5).map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/my-quotation/${quote.id}`}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div>
                      <div className="font-medium text-shielder-dark">{quote.referenceNumber}</div>
                      <div className="text-sm text-gray-600">
                        {new Date(quote.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(quote.status)}`}>
                        {quote.status}
                      </span>
                      <div className="text-right">
                        <div className="font-semibold text-shielder-dark">AED {Number(quote.amount).toFixed(2)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No quotations yet.{' '}
                <Link href="/generate-quotation" className="text-shielder-accent font-medium hover:underline">
                  Request One
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
