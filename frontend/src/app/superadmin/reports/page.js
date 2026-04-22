'use client';
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReportsDashboard;
var react_1 = require("react");
var FixedSARMark_1 = require("@/components/FixedSARMark");
var lucide_react_1 = require("lucide-react");
var admin_service_1 = require("@/services/admin.service");
var recharts_1 = require("recharts");
var date_fns_1 = require("date-fns");
var react_hot_toast_1 = require("react-hot-toast");
var LanguageContext_1 = require("@/contexts/LanguageContext");
var UnifiedPagination_1 = require("@/components/ui/UnifiedPagination");
var react_query_1 = require("@tanstack/react-query");
var COLORS = ['#1a1a1a', '#eab308', '#22c55e', '#ef4444', '#3b82f6', '#a855f7'];
function ReportsDashboard() {
    var _this = this;
    var _a;
    var _b = (0, LanguageContext_1.useLanguage)(), t = _b.t, isRTL = _b.isRTL;
    var queryClient = (0, react_query_1.useQueryClient)();
    var _c = (0, react_1.useState)('OVERVIEW'), activeTab = _c[0], setActiveTab = _c[1];
    var _d = (0, react_1.useState)('30D'), dateRange = _d[0], setDateRange = _d[1];
    var _e = (0, react_1.useState)({ from: '', to: '' }), customRange = _e[0], setCustomRange = _e[1];
    var _f = (0, react_1.useState)({
        categoryId: '',
        paymentStatus: '',
        orderStatus: ''
    }), filters = _f[0], setFilters = _f[1];
    var _g = (0, react_1.useState)(1), salesTablePage = _g[0], setSalesTablePage = _g[1];
    var _h = (0, react_1.useState)(1), ordersTablePage = _h[0], setOrdersTablePage = _h[1];
    var REPORT_TABLE_PAGE_SIZE = 10;
    var getDateBounds = function () {
        var fromDate = (0, date_fns_1.subDays)(new Date(), 30);
        var toDate = new Date();
        if (dateRange === '7D')
            fromDate = (0, date_fns_1.subDays)(new Date(), 7);
        if (dateRange === 'TODAY')
            fromDate = (0, date_fns_1.startOfDay)(new Date());
        if (dateRange === 'CUSTOM' && customRange.from && customRange.to) {
            fromDate = new Date(customRange.from);
            toDate = new Date(customRange.to);
        }
        return { fromDate: fromDate, toDate: toDate };
    };
    var categoriesQuery = (0, react_query_1.useQuery)({
        queryKey: ['superadmin-reports-categories'],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var res;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, admin_service_1.default.getCategories()];
                    case 1:
                        res = _b.sent();
                        return [2 /*return*/, ((_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.data) || []];
                }
            });
        }); },
        staleTime: 30 * 60 * 1000,
    });
    var reportParams = (0, react_1.useMemo)(function () {
        var _a = getDateBounds(), fromDate = _a.fromDate, toDate = _a.toDate;
        var params = {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
        };
        if (activeTab === 'SALES') {
            if (filters.categoryId)
                params.categoryId = filters.categoryId;
            if (filters.paymentStatus)
                params.paymentStatus = filters.paymentStatus;
            if (filters.orderStatus)
                params.orderStatus = filters.orderStatus;
        }
        return params;
    }, [activeTab, dateRange, customRange.from, customRange.to, filters.categoryId, filters.paymentStatus, filters.orderStatus]);
    var reportQuery = (0, react_query_1.useQuery)({
        queryKey: ['superadmin-reports-data', activeTab, reportParams],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var res;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(activeTab === 'OVERVIEW')) return [3 /*break*/, 2];
                        return [4 /*yield*/, admin_service_1.default.getReportsOverview(reportParams)];
                    case 1:
                        res = _b.sent();
                        return [3 /*break*/, 12];
                    case 2:
                        if (!(activeTab === 'SALES')) return [3 /*break*/, 4];
                        return [4 /*yield*/, admin_service_1.default.getSalesReport(reportParams)];
                    case 3:
                        res = _b.sent();
                        return [3 /*break*/, 12];
                    case 4:
                        if (!(activeTab === 'ORDERS')) return [3 /*break*/, 6];
                        return [4 /*yield*/, admin_service_1.default.getOrderReport(reportParams)];
                    case 5:
                        res = _b.sent();
                        return [3 /*break*/, 12];
                    case 6:
                        if (!(activeTab === 'INVENTORY')) return [3 /*break*/, 8];
                        return [4 /*yield*/, admin_service_1.default.getInventoryReport()];
                    case 7:
                        res = _b.sent();
                        return [3 /*break*/, 12];
                    case 8:
                        if (!(activeTab === 'PAYMENTS')) return [3 /*break*/, 10];
                        return [4 /*yield*/, admin_service_1.default.getPaymentReport(reportParams)];
                    case 9:
                        res = _b.sent();
                        return [3 /*break*/, 12];
                    case 10: return [4 /*yield*/, admin_service_1.default.getProfitLossReport(reportParams)];
                    case 11:
                        res = _b.sent();
                        _b.label = 12;
                    case 12: return [2 /*return*/, (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a.data];
                }
            });
        }); },
        enabled: dateRange !== 'CUSTOM' || Boolean(customRange.from && customRange.to),
        staleTime: 30 * 1000,
        placeholderData: function (previousData) { return previousData; },
    });
    var categories = categoriesQuery.data || [];
    var data = (_a = reportQuery.data) !== null && _a !== void 0 ? _a : null;
    var loading = reportQuery.isLoading;
    (0, react_1.useEffect)(function () {
        setSalesTablePage(1);
        setOrdersTablePage(1);
    }, [activeTab, dateRange, filters.categoryId, filters.paymentStatus, filters.orderStatus, customRange.from, customRange.to]);
    var handleExport = function (formatSelection) { return __awaiter(_this, void 0, void 0, function () {
        var format_1, fromDate, toDate, params, response, blob, url, link, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    format_1 = formatSelection.toLowerCase();
                    react_hot_toast_1.default.loading("Preparing ".concat(formatSelection, " report..."), { id: 'export' });
                    fromDate = (0, date_fns_1.subDays)(new Date(), 30);
                    toDate = new Date();
                    if (dateRange === '7D')
                        fromDate = (0, date_fns_1.subDays)(new Date(), 7);
                    if (dateRange === 'TODAY')
                        fromDate = (0, date_fns_1.startOfDay)(new Date());
                    if (dateRange === 'CUSTOM' && customRange.from && customRange.to) {
                        fromDate = new Date(customRange.from);
                        toDate = new Date(customRange.to);
                    }
                    params = {
                        from: fromDate.toISOString(),
                        to: toDate.toISOString(),
                        format: formatSelection.toLowerCase() === 'excel' ? 'excel' : formatSelection.toLowerCase()
                    };
                    if (filters.categoryId)
                        params.categoryId = filters.categoryId;
                    if (filters.paymentStatus)
                        params.paymentStatus = filters.paymentStatus;
                    if (filters.orderStatus)
                        params.orderStatus = filters.orderStatus;
                    return [4 /*yield*/, admin_service_1.default.downloadSalesReport(params)];
                case 1:
                    response = _a.sent();
                    blob = new Blob([response.data], {
                        type: format_1 === 'pdf' ? 'application/pdf' :
                            format_1 === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                                'text/csv'
                    });
                    url = window.URL.createObjectURL(blob);
                    link = document.createElement('a');
                    link.href = url;
                    link.setAttribute('download', "sales-report-".concat(new Date().getTime(), ".").concat(format_1 === 'excel' ? 'xlsx' : format_1));
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                    return [4 /*yield*/, admin_service_1.default.logReportExport({ reportType: activeTab, format: formatSelection })];
                case 2:
                    _a.sent();
                    react_hot_toast_1.default.success("".concat(formatSelection, " exported successfully!"), { id: 'export' });
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    react_hot_toast_1.default.error('Export failed', { id: 'export' });
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="relative min-h-screen overflow-hidden bg-slate-50/90 pb-12" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-gradient-to-b from-[#0C1B33]/8 via-transparent to-transparent"/>
      <div className="mx-auto max-w-7xl space-y-5 px-4 pt-4 md:px-8 md:pt-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[2.25rem] border border-white/60 bg-white/85 p-5 md:p-6 shadow-[0_20px_60px_rgba(12,27,51,0.08)] backdrop-blur">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-shielder-primary/70">Enterprise analytics</p>
          <h1 className="text-2xl font-black text-shielder-dark uppercase tracking-tight">{t('enterpriseReportsTitle')}</h1>
          <p className="text-gray-500 text-sm font-medium">{t('enterpriseReportsSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-2xl bg-slate-100 p-1 shadow-inner">
            {['TODAY', '7D', '30D', 'CUSTOM'].map(function (range) { return (<button key={range} onClick={function () { return setDateRange(range); }} className={"px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ".concat(dateRange === range ? 'bg-white text-shielder-dark shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                {range}
              </button>); })}
          </div>

          {dateRange === 'CUSTOM' && (<div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100 animate-in fade-in zoom-in duration-200">
              <input type="date" value={customRange.from} onChange={function (e) { return setCustomRange(function (prev) { return (__assign(__assign({}, prev), { from: e.target.value })); }); }} className="bg-transparent text-[10px] font-bold uppercase tracking-widest px-2 py-1 focus:outline-none"/>
              <span className="text-gray-300 text-[10px] font-black">TO</span>
              <input type="date" value={customRange.to} onChange={function (e) { return setCustomRange(function (prev) { return (__assign(__assign({}, prev), { to: e.target.value })); }); }} className="bg-transparent text-[10px] font-bold uppercase tracking-widest px-2 py-1 focus:outline-none"/>
              <button onClick={function () {
                queryClient.invalidateQueries({ queryKey: ['superadmin-reports-data'] });
            }} className="bg-shielder-dark text-white p-1.5 rounded-lg hover:bg-black transition-colors" title="Apply Custom Range">
                <lucide_react_1.RefreshCcw size={12} className={reportQuery.isFetching ? 'animate-spin' : ''}/>
              </button>
            </div>)}

          <div className="flex items-center space-x-2">
            <select onChange={function (e) { return handleExport(e.target.value); }} className="px-4 py-2.5 bg-shielder-dark text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-black/10 focus:outline-none appearance-none cursor-pointer" defaultValue="">
              <option value="" disabled>Export As...</option>
              <option value="PDF">PDF Document</option>
              <option value="EXCEL">Excel Spreadsheet</option>
              <option value="CSV">CSV Data File</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
        {[
            { id: 'OVERVIEW', label: 'Overview', icon: lucide_react_1.BarChart3 },
            { id: 'SALES', label: 'Sales', icon: lucide_react_1.TrendingUp },
            { id: 'ORDERS', label: 'Orders', icon: lucide_react_1.ShoppingCart },
            { id: 'INVENTORY', label: 'Inventory', icon: lucide_react_1.Package },
            { id: 'PAYMENTS', label: 'Payments', icon: lucide_react_1.Banknote },
            { id: 'PROFIT', label: 'P&L', icon: lucide_react_1.FileText }
        ].map(function (tab) { return (<button key={tab.id} onClick={function () { return setActiveTab(tab.id); }} className={"flex items-center space-x-2 px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ".concat(activeTab === tab.id
                ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-lg shadow-[#FF6B35]/20'
                : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300')}>
            <tab.icon size={14}/>
            <span>{tab.label}</span>
          </button>); })}
      </div>

      {/* Advanced Filters (Only for Sales) */}
      {activeTab === 'SALES' && (<div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center space-x-2">
            <lucide_react_1.Filter size={14} className="text-gray-400"/>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters:</span>
          </div>
          
          <select value={filters.categoryId} onChange={function (e) { return setFilters(function (prev) { return (__assign(__assign({}, prev), { categoryId: e.target.value })); }); }} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-shielder-dark focus:outline-none focus:ring-1 focus:ring-shielder-primary cursor-pointer">
            <option value="">All Categories</option>
            {categories.map(function (cat) {
                var _a, _b;
                return (<option key={cat.id} value={cat.id}>
                {((_b = (_a = cat.translations) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.name) || cat.name || 'Category'}
              </option>);
            })}
          </select>

          <select value={filters.paymentStatus} onChange={function (e) { return setFilters(function (prev) { return (__assign(__assign({}, prev), { paymentStatus: e.target.value })); }); }} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-shielder-dark focus:outline-none focus:ring-1 focus:ring-shielder-primary cursor-pointer">
            <option value="">All Payment Status</option>
            <option value="PAID">Paid</option>
            <option value="UNPAID">Unpaid</option>
            <option value="REFUNDED">Refunded</option>
            <option value="PARTIAL">Partial</option>
          </select>

          <select value={filters.orderStatus} onChange={function (e) { return setFilters(function (prev) { return (__assign(__assign({}, prev), { orderStatus: e.target.value })); }); }} className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-bold uppercase tracking-widest text-shielder-dark focus:outline-none focus:ring-1 focus:ring-shielder-primary cursor-pointer">
            <option value="">All Order Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button onClick={function () { return setFilters({ categoryId: '', paymentStatus: '', orderStatus: '' }); }} className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors">
            Clear Filters
          </button>
        </div>)}

      {loading ? (<ReportSkeleton />) : (<div className="space-y-6 animate-in fade-in duration-500">
          {activeTab === 'OVERVIEW' && <OverviewTab data={data}/>}
          {activeTab === 'SALES' && (<SalesTab data={data} page={salesTablePage} pageSize={REPORT_TABLE_PAGE_SIZE} onPageChange={setSalesTablePage} isRTL={isRTL}/>)}
          {activeTab === 'ORDERS' && (<OrdersTab data={data} page={ordersTablePage} pageSize={REPORT_TABLE_PAGE_SIZE} onPageChange={setOrdersTablePage} isRTL={isRTL}/>)}
          {activeTab === 'INVENTORY' && <InventoryTab data={data}/>}
          {activeTab === 'PAYMENTS' && <PaymentsTab data={data}/>}
          {activeTab === 'PROFIT' && <ProfitLossTab data={data}/>}
        </div>)}
      </div>
    </div>);
}
function OverviewTab(_a) {
    var data = _a.data;
    if (!data || !data.summary) {
        return <NoDataState title="Overview"/>;
    }
    var summary = data.summary;
    var RiyalMark = function (_a) {
        var _b = _a.size, size = _b === void 0 ? 16 : _b, _c = _a.className, className = _c === void 0 ? '' : _c;
        return (<FixedSARMark_1.default size={size} className={className}/>);
    };
    return (<div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryCard title="Total Sales" value={<span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{(summary.totalSales || 0).toLocaleString()}</span>} subtitle="Net processed payments" icon={<lucide_react_1.BarChart3 size={18}/>} color="bg-shielder-dark"/>
        <SummaryCard title="Total Orders" value={summary.orderCount || 0} subtitle="New orders in period" icon={<lucide_react_1.ShoppingCart size={18}/>} color="bg-shielder-secondary"/>
        <SummaryCard title="Total Revenue" value={<span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{(summary.totalRevenue || 0).toLocaleString()}</span>} subtitle="Gross business intake" icon={<lucide_react_1.TrendingUp size={18}/>} color="bg-emerald-500"/>
        <SummaryCard title="Total Refunds" value={<span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{(summary.totalRefunds || 0).toLocaleString()}</span>} subtitle="Money returned to clients" icon={<lucide_react_1.RefreshCcw size={18}/>} color="bg-red-500"/>
        <SummaryCard title="Net Profit" value={<span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{(summary.netProfit || 0).toLocaleString()}</span>} subtitle="Revenue - (Refunds + Expenses)" icon={<lucide_react_1.FileText size={18}/>} color="bg-purple-500"/>
        <SummaryCard title="Low Stock Products" value={summary.lowStockProducts || 0} subtitle="Items requiring restock" icon={<lucide_react_1.Package size={18}/>} color="bg-orange-500"/>
      </div>

      {data.salesTrend && data.salesTrend.length > 0 ? (<div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Executive Sales Trend</h3>
          <div className="h-[300px]">
            <recharts_1.ResponsiveContainer width="100%" height="100%">
              <recharts_1.LineChart data={data.salesTrend}>
                <recharts_1.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1"/>
                <recharts_1.XAxis dataKey="date" tickFormatter={function (val) { return val ? (0, date_fns_1.format)(new Date(val), 'MMM dd') : ''; }} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
                <recharts_1.YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
                <recharts_1.Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} labelFormatter={function (val) { return val ? (0, date_fns_1.format)(new Date(val), 'MMMM dd, yyyy') : ''; }}/>
                <recharts_1.Line type="monotone" dataKey="amount" stroke="#eab308" strokeWidth={4} dot={{ r: 4, fill: '#eab308' }} activeDot={{ r: 6 }}/>
              </recharts_1.LineChart>
            </recharts_1.ResponsiveContainer>
          </div>
        </div>) : (<div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Sales Trend Available</p>
        </div>)}
    </div>);
}
function SalesTab(_a) {
    var data = _a.data, page = _a.page, pageSize = _a.pageSize, onPageChange = _a.onPageChange, isRTL = _a.isRTL;
    if (!data) {
        return <NoDataState title="Sales"/>;
    }
    var _b = data.summary, summary = _b === void 0 ? {} : _b, _c = data.salesByDate, salesByDate = _c === void 0 ? [] : _c, _d = data.salesByCategory, salesByCategory = _d === void 0 ? [] : _d, _e = data.salesByProduct, salesByProduct = _e === void 0 ? [] : _e, _f = data.topSellingProducts, topSellingProducts = _f === void 0 ? [] : _f;
    var salesTotalPages = Math.max(1, Math.ceil(salesByProduct.length / pageSize));
    var pagedSalesByProduct = salesByProduct.slice((page - 1) * pageSize, page * pageSize);
    return (<div className="space-y-6">
      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Filtered Revenue" value={<span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{(summary.totalRevenue || 0).toLocaleString()}</span>} subtitle="Total for selected filters" icon={<lucide_react_1.Banknote size={18}/>} color="bg-shielder-dark"/>
        <SummaryCard title="Units Sold" value={(summary.totalUnitsSold || 0).toLocaleString()} subtitle="Volume in period" icon={<lucide_react_1.Package size={18}/>} color="bg-amber-500"/>
        <SummaryCard title="Distinct Products" value={summary.productCount || 0} subtitle="Unique SKUs moved" icon={<lucide_react_1.ShoppingCart size={18}/>} color="bg-blue-500"/>
        <SummaryCard title="Avg value/day" value={<span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{(summary.averageOrderValue || 0).toLocaleString()}</span>} subtitle="Based on selected range" icon={<lucide_react_1.TrendingUp size={18}/>} color="bg-emerald-500"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative min-h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Sales by Date (SAR)</h3>
          {salesByDate.length > 0 ? (<div className="h-[300px]">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.LineChart data={salesByDate}>
                  <recharts_1.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1"/>
                  <recharts_1.XAxis dataKey="date" tickFormatter={function (val) { return val ? (0, date_fns_1.format)(new Date(val), 'MMM dd') : ''; }} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
                  <recharts_1.YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
                  <recharts_1.Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} labelFormatter={function (val) { return val ? (0, date_fns_1.format)(new Date(val), 'MMMM dd, yyyy') : ''; }}/>
                  <recharts_1.Line type="monotone" dataKey="amount" stroke="#1a1a1a" strokeWidth={4} dot={{ r: 4, fill: '#1a1a1a' }} activeDot={{ r: 6 }}/>
                </recharts_1.LineChart>
              </recharts_1.ResponsiveContainer>
            </div>) : (<div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <lucide_react_1.BarChart3 size={40} className="mb-2 opacity-20"/>
              <p className="text-[10px] font-black uppercase tracking-widest">No matching sales trend</p>
            </div>)}
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm relative min-h-[400px]">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Sales by Category</h3>
          {salesByCategory.length > 0 ? (<div className="h-[300px]">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.PieChart>
                  <recharts_1.Pie data={salesByCategory} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="revenue" nameKey="name">
                    {salesByCategory.map(function (_entry, index) { return (<recharts_1.Cell key={"cell-".concat(index)} fill={COLORS[index % COLORS.length]}/>); })}
                  </recharts_1.Pie>
                  <recharts_1.Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}/>
                  <recharts_1.Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}/>
                </recharts_1.PieChart>
              </recharts_1.ResponsiveContainer>
            </div>) : (<div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
              <lucide_react_1.PieChart size={40} className="mb-2 opacity-20"/>
              <p className="text-[10px] font-black uppercase tracking-widest">No category data</p>
            </div>)}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Top 10 Best-Selling Products (Units Sold)</h3>
          {topSellingProducts.length > 0 ? (<div className="h-[350px]">
              <recharts_1.ResponsiveContainer width="100%" height="100%">
                <recharts_1.BarChart data={topSellingProducts} layout="vertical">
                  <recharts_1.CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f1f1"/>
                  <recharts_1.XAxis type="number" hide/>
                  <recharts_1.YAxis dataKey="name" type="category" width={190} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 800, fill: '#0A1E36' }}/>
                  <recharts_1.Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}/>
                  <recharts_1.Bar dataKey="sales" fill="#eab308" radius={[0, 4, 4, 0]} barSize={20}/>
                </recharts_1.BarChart>
              </recharts_1.ResponsiveContainer>
            </div>) : (<div className="flex flex-col items-center justify-center h-[350px] text-gray-400">
               <lucide_react_1.Package size={40} className="mb-2 opacity-20"/>
               <p className="text-[10px] font-black uppercase tracking-widest">No product sales yet</p>
            </div>)}
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Detailed Product Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product Name</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Items Sold</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedSalesByProduct.map(function (product) { return (<tr key={product.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-4 font-bold text-sm text-shielder-dark">{product.name}</td>
                  <td className="px-8 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">{product.categoryName}</td>
                  <td className="px-8 py-4 text-center text-sm font-medium text-gray-600">{product.quantitySold}</td>
                  <td className="px-8 py-4 text-right text-sm font-black text-shielder-dark"><span className="inline-flex items-center gap-0.5"><FixedSARMark_1.default />{(product.totalRevenue || 0).toLocaleString()}</span></td>
                </tr>); })}
              {salesByProduct.length === 0 && (<tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No performance data available for current filters</td>
                </tr>)}
            </tbody>
          </table>
        </div>
        {salesByProduct.length > 0 && (<UnifiedPagination_1.default page={page} totalPages={salesTotalPages} totalItems={salesByProduct.length} pageSize={pageSize} onPageChange={onPageChange} isRTL={isRTL}/>)}
      </div>
    </div>);
}
function NoDataState(_a) {
    var title = _a.title;
    return (<div className="bg-white p-20 rounded-[3rem] border border-gray-100 shadow-sm text-center">
      <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300">
        <lucide_react_1.FileText size={40}/>
      </div>
      <h3 className="text-xl font-black text-shielder-dark uppercase tracking-tight">No {title} Data Found</h3>
      <p className="text-gray-400 text-sm font-medium mt-2">Try adjusting your date range or filters.</p>
    </div>);
}
function OrdersTab(_a) {
    var data = _a.data, page = _a.page, pageSize = _a.pageSize, onPageChange = _a.onPageChange, isRTL = _a.isRTL;
    if (!data || !data.stats) {
        return <NoDataState title="Orders"/>;
    }
    var stats = data.stats || {};
    var total = Object.values(stats || {}).reduce(function (acc, curr) { return acc + (Number(curr) || 0); }, 0);
    var recentLargeOrders = data.recentLargeOrders || [];
    var ordersTotalPages = Math.max(1, Math.ceil(recentLargeOrders.length / pageSize));
    var pagedRecentLargeOrders = recentLargeOrders.slice((page - 1) * pageSize, page * pageSize);
    return (<div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <OrderStats title="Total Orders" value={total} color="text-shielder-dark"/>
        <OrderStats title="Completed" value={stats.DELIVERED || 0} color="text-emerald-500"/>
        <OrderStats title="Cancelled" value={stats.CANCELLED || 0} color="text-red-500"/>
        <OrderStats title="Pending" value={stats.PENDING || 0} color="text-orange-500"/>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Order Volume Trend</h3>
        <div className="h-[300px]">
          <recharts_1.ResponsiveContainer width="100%" height="100%">
            <recharts_1.BarChart data={data.trend || []}>
              <recharts_1.CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1"/>
              <recharts_1.XAxis dataKey="date" tickFormatter={function (val) { return val ? (0, date_fns_1.format)(new Date(val), 'MMM dd') : ''; }} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
              <recharts_1.YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
              <recharts_1.Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} labelFormatter={function (val) { return val ? (0, date_fns_1.format)(new Date(val), 'MMMM dd, yyyy') : ''; }}/>
              <recharts_1.Bar dataKey="count" fill="#eab308" radius={[6, 6, 0, 0]} barSize={20}/>
            </recharts_1.BarChart>
          </recharts_1.ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Recent High-Value Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order ID</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Date</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pagedRecentLargeOrders.map(function (order) { return (<tr key={order.id} className="hover:bg-gray-50/30 transition-colors">
                  <td className="px-8 py-4 font-bold text-sm text-shielder-dark">#{order.orderNumber}</td>
                  <td className="px-8 py-4 text-sm font-medium text-gray-600">{order.customerName}</td>
                  <td className="px-8 py-4 text-center text-sm font-medium text-gray-500">{order.createdAt ? (0, date_fns_1.format)(new Date(order.createdAt), 'MMM dd, yyyy') : 'N/A'}</td>
                  <td className="px-8 py-4 text-right text-sm font-black text-shielder-dark"><span className="inline-flex items-center gap-0.5"><FixedSARMark_1.default />{(order.totalAmount || 0).toLocaleString()}</span></td>
                </tr>); })}
              {recentLargeOrders.length === 0 && (<tr>
                  <td colSpan={4} className="px-8 py-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No High-Value Orders Found</td>
                </tr>)}
            </tbody>
          </table>
        </div>
        {recentLargeOrders.length > 0 && (<UnifiedPagination_1.default page={page} totalPages={ordersTotalPages} totalItems={recentLargeOrders.length} pageSize={pageSize} onPageChange={onPageChange} isRTL={isRTL}/>)}
      </div>
    </div>);
}
function InventoryTab(_a) {
    var data = _a.data;
    if (!data || data.currentStockTotal === undefined) {
        return <NoDataState title="Inventory"/>;
    }
    return (<div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Current Corporate Stock</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-4xl font-black text-shielder-dark leading-none">{(data.currentStockTotal || 0).toLocaleString()}</h2>
            <div className="p-2 bg-shielder-dark text-white rounded-xl"><lucide_react_1.Package size={20}/></div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">Total pieces across all categories</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Critical Stock Alerts</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className={"text-4xl font-black leading-none ".concat((data.lowStockCount || 0) > 5 ? 'text-red-500' : 'text-orange-500')}>{data.lowStockCount || 0}</h2>
            <div className={"p-2 rounded-xl text-white ".concat((data.lowStockCount || 0) > 5 ? 'bg-red-500' : 'bg-orange-500')}><lucide_react_1.AlertTriangle size={20}/></div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">Items below inventory threshold</p>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Liquidated (OOS)</p>
          <div className="flex items-end justify-between mt-2">
            <h2 className="text-4xl font-black text-gray-400 leading-none">{data.outOfStockCount || 0}</h2>
            <div className="p-2 bg-gray-100 text-gray-400 rounded-xl"><lucide_react_1.ChevronRight size={20}/></div>
          </div>
          <p className="text-[10px] text-gray-400 font-bold mt-4 uppercase">Products with zero inventory</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-gray-50/20">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Industrial Stock Movement History</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {(data.recentMovement || []).map(function (log) {
            var _a, _b, _c;
            return (<div key={log.id} className="p-4 px-8 flex items-center justify-between hover:bg-gray-50/50 transition-all">
              <div className="flex items-center space-x-4">
                <div className={"w-2 h-10 rounded-full ".concat(log.quantity > 0 ? 'bg-emerald-500' : 'bg-red-500')}/>
                <div>
                   <p className="text-xs font-black text-shielder-dark uppercase tracking-tight">{log.product_name || ((_c = (_b = (_a = log.product) === null || _a === void 0 ? void 0 : _a.translations) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.name)}</p>
                   <p className="text-[10px] text-gray-400 font-bold">{(0, date_fns_1.format)(new Date(log.created_at || log.createdAt || new Date()), 'MMM dd, HH:mm')}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={"text-sm font-black ".concat(log.quantity > 0 ? 'text-emerald-500' : 'text-red-500')}>
                  {log.quantity > 0 ? '+' : ''}{log.quantity} UNITS
                </p>
                <p className="text-[10px] text-gray-400 uppercase font-black">{(log.type || '').replace('_', ' ')}</p>
              </div>
            </div>);
        })}
        </div>
      </div>
    </div>);
}
function PaymentsTab(_a) {
    var _b, _c, _d, _e, _f, _g, _h, _j;
    var data = _a.data;
    if (!data || !data.stats) {
        return <NoDataState title="Payments"/>;
    }
    var stats = data.stats || {};
    return (<div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
           <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-8">Revenue Stream Trend</h3>
           <div className="h-[250px]">
             <recharts_1.ResponsiveContainer width="100%" height="100%">
               <recharts_1.BarChart data={data.revenueTrend || []}>
                  <recharts_1.XAxis dataKey="date" hide/>
                  <recharts_1.Tooltip labelFormatter={function (v) { return v ? (0, date_fns_1.format)(new Date(v), 'PPP') : ''; }}/>
                  <recharts_1.Bar dataKey="amount" fill="#1a1a1a" radius={[4, 4, 0, 0]}/>
               </recharts_1.BarChart>
             </recharts_1.ResponsiveContainer>
           </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <PaymentStatCard label="Total Paid" value={((_b = stats.PAID) === null || _b === void 0 ? void 0 : _b.amount) || 0} count={((_c = stats.PAID) === null || _c === void 0 ? void 0 : _c.count) || 0} color="emerald"/>
          <PaymentStatCard label="Pending" value={((_d = stats.PENDING) === null || _d === void 0 ? void 0 : _d.amount) || 0} count={((_e = stats.PENDING) === null || _e === void 0 ? void 0 : _e.count) || 0} color="orange"/>
          <PaymentStatCard label="Refunded" value={((_f = stats.REFUNDED) === null || _f === void 0 ? void 0 : _f.amount) || 0} count={((_g = stats.REFUNDED) === null || _g === void 0 ? void 0 : _g.count) || 0} color="red"/>
          <PaymentStatCard label="Failed" value={((_h = stats.FAILED) === null || _h === void 0 ? void 0 : _h.amount) || 0} count={((_j = stats.FAILED) === null || _j === void 0 ? void 0 : _j.count) || 0} color="gray"/>
        </div>
      </div>
    </div>);
}
function ProfitLossTab(_a) {
    var data = _a.data;
    if (!data) {
        return <NoDataState title="Profit & Loss"/>;
    }
    var totalSales = data.totalSales || 0;
    var totalRefunds = data.totalRefunds || 0;
    var totalExpenses = data.totalExpenses || 0;
    var netProfit = data.netProfit !== undefined ? data.netProfit : (totalSales - totalRefunds - totalExpenses);
    var margin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;
    return (<div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-shielder-dark text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-shielder-secondary/20 rounded-full blur-3xl -mr-32 -mt-32"/>
        <p className="text-xs font-black uppercase tracking-[0.3em] opacity-50 mb-4">Enterprise P&L Statement</p>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
           <div className="space-y-2">
              <h2 className="text-5xl md:text-6xl font-black tracking-tighter"><span className="inline-flex items-center gap-2"><FixedSARMark_1.default size={48}/>{netProfit.toLocaleString()}</span></h2>
              <p className="text-shielder-secondary font-black text-xs md:text-sm uppercase tracking-widest flex items-center">
                Net Industrial Profit
                <lucide_react_1.ArrowUpRight size={16} className="ml-1"/>
              </p>
           </div>
           <div className="text-right">
              <p className="text-4xl font-black">{margin.toFixed(1)}%</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">Profit Margin</p>
           </div>
        </div>
          <button onClick={function () {
            react_hot_toast_1.default.success('Generating P&L Statement...');
        }} className="mt-7 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all inline-flex items-center space-x-2">
          <lucide_react_1.Download size={14}/>
          <span>Download Statement</span>
        </button>
      </div>

        <div className="bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-7">
          <div className="flex justify-between items-center pb-7 border-b border-gray-50">
            <div className="space-y-1.5">
              <p className="text-2xl font-black text-shielder-dark leading-none"><span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{totalSales.toLocaleString()}</span></p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Sales (Paid)</p>
           </div>
           <lucide_react_1.ChevronRight className="text-gray-200"/>
            <div className="space-y-1.5 text-right">
              <p className="text-2xl font-black text-red-500 leading-none">-<span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{totalRefunds.toLocaleString()}</span></p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Refunds</p>
           </div>
        </div>
          <div className="flex justify-between items-center pb-7 border-b border-gray-50">
            <div className="space-y-1.5">
              <p className="text-2xl font-black text-emerald-500 leading-none"><span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{(totalSales - totalRefunds).toLocaleString()}</span></p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gross Profit</p>
           </div>
           <lucide_react_1.ChevronRight className="text-gray-200"/>
            <div className="space-y-1.5 text-right">
              <p className="text-2xl font-black text-orange-500 leading-none">-<span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{totalExpenses.toLocaleString()}</span></p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Operating Expenses</p>
           </div>
        </div>
          <div className="flex justify-between items-center bg-gray-50 rounded-2xl px-6 py-5">
           <p className="text-xs font-black uppercase tracking-widest text-shielder-dark">Net Operating Income</p>
            <p className="text-2xl font-black text-shielder-dark"><span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{netProfit.toLocaleString()}</span></p>
        </div>
      </div>
    </div>);
}
function SummaryCard(_a) {
    var title = _a.title, value = _a.value, subtitle = _a.subtitle, icon = _a.icon, color = _a.color;
    return (<div className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:border-shielder-primary/20 transition-all group min-h-[220px] flex flex-col justify-between">
      <div className={"w-12 h-12 ".concat(color, " rounded-xl flex items-center justify-center text-white shadow-md mb-5 group-hover:scale-105 transition-transform")}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-shielder-dark tracking-tighter leading-none">{value}</h3>
      </div>
      <div className="w-12 h-1 bg-gray-50 my-4"/>
      <p className="text-[10px] font-bold text-gray-400 italic lowercase">{subtitle}</p>
    </div>);
}
function OrderStats(_a) {
    var title = _a.title, value = _a.value, color = _a.color;
    return (<div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm text-center space-y-1.5">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
      <p className={"text-2xl font-black ".concat(color)}>{value}</p>
    </div>);
}
function PaymentStatCard(_a) {
    var label = _a.label, value = _a.value, count = _a.count, color = _a.color;
    var colors = {
        emerald: 'bg-emerald-50 text-emerald-600',
        orange: 'bg-orange-50 text-orange-600',
        red: 'bg-red-50 text-red-600',
        gray: 'bg-gray-50 text-gray-600'
    };
    return (<div className={"".concat(colors[color], " p-5 rounded-3xl space-y-2 shadow-sm")}>
       <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{label}</p>
      <h4 className="text-xl font-black tracking-tight"><span className="inline-flex items-center gap-1"><FixedSARMark_1.default />{value.toLocaleString()}</span></h4>
       <p className="text-[10px] font-bold opacity-60 uppercase">{count} TRANSACTIONS</p>
    </div>);
}
function ReportSkeleton() {
    return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3, 4, 5, 6].map(function (i) { return (<div key={i} className="h-48 bg-gray-100 rounded-3xl"/>); })}
    </div>);
}
