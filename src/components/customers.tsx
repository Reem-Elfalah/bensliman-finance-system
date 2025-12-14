// src/pages/customers.tsx
import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import {
  FileText,
  Trash2,
  Home,
  LogOut,
  Filter,
  ArrowUpDown,
  User,
  Building,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { ReportGenerator, Transaction } from "./Reports/reports";
import { CompanyReport } from "./Reports/CompanyReport";
import DatePicker, { registerLocale } from "react-datepicker";
import ar from "date-fns/locale/ar";
import "react-datepicker/dist/react-datepicker.css";
import { Link, useNavigate } from "react-router-dom";
import { CustomerDialog } from "../components/CustomerDialog";

registerLocale("ar", ar);

type Customer = {
  id: string;
  name: string;
  created_at: string;
  updated_at?: string;
  phones?: string[];
  email?: string;
  status?: string;
  notes?: string;
};

export default function CustomersPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<
    "recent-transactions" | "recent-customers" | "name"
  >("recent-transactions");
  const [isCompanyReportOpen, setIsCompanyReportOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage] = useState(10);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, dateFrom, dateTo]);

  // Add this function to refresh customers
  const refreshCustomers = async () => {
    setLoading(true);
    try {
      const { data: customersData, error: customersError } = await supabase
        .from("customers")
        .select("*");

      if (customersError) {
        console.error("Error fetching customers:", customersError);
      } else {
        setCustomers(customersData || []);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch customers with full data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: customersData, error: customersError } = await supabase
          .from("customers")
          .select("*");

        if (customersError) {
          console.error("Error fetching customers:", customersError);
        } else {
          setCustomers(customersData || []);
        }

        const { data: transactionsData, error: transactionsError } =
          await supabase.from("transactions").select("*");

        if (transactionsError) {
          console.error("Error fetching transactions:", transactionsError);
        } else {
          setTransactions(transactionsData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get customer transaction info
  const getCustomerTransactionInfo = (customerName: string) => {
    const allCustomerTransactions = transactions.filter(
      (t) => t.CustomerName === customerName
    );
    const totalTransactionCount = allCustomerTransactions.length;

    const filteredCustomerTransactions = allCustomerTransactions.filter(
      (transaction) => {
        if (!dateFrom && !dateTo) return true;

        const transactionDate = new Date(transaction.created_at);
        const fromDate = dateFrom
          ? new Date(dateFrom.setHours(0, 0, 0, 0))
          : null;
        const toDate = dateTo
          ? new Date(dateTo.setHours(23, 59, 59, 999))
          : null;

        const matchesFrom = !fromDate || transactionDate >= fromDate;
        const matchesTo = !toDate || transactionDate <= toDate;

        return matchesFrom && matchesTo;
      }
    );

    const latestTransaction = allCustomerTransactions.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    const latestTransactionDate = latestTransaction?.created_at;

    return {
      totalTransactionCount,
      filteredTransactionCount: filteredCustomerTransactions.length,
      latestTransactionDate,
      filteredCustomerTransactions,
    };
  };

  // Filter by search
  const searchFilteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(search.toLowerCase())
  );

  // Apply date filtering
  const dateFilteredCustomers = searchFilteredCustomers.filter((customer) => {
    if (!dateFrom && !dateTo) return true;
    const customerInfo = getCustomerTransactionInfo(customer.name);
    return customerInfo.filteredTransactionCount > 0;
  });

  // Apply sorting
  const sortedCustomers = [...dateFilteredCustomers].sort((a, b) => {
    const aInfo = getCustomerTransactionInfo(a.name);
    const bInfo = getCustomerTransactionInfo(b.name);

    switch (sortBy) {
      case "recent-transactions":
        // Sort by transaction count (most to least), then by latest transaction date
        if (bInfo.totalTransactionCount !== aInfo.totalTransactionCount) {
          return bInfo.totalTransactionCount - aInfo.totalTransactionCount;
        }
        if (aInfo.latestTransactionDate && bInfo.latestTransactionDate) {
          return (
            new Date(bInfo.latestTransactionDate).getTime() -
            new Date(aInfo.latestTransactionDate).getTime()
          );
        }
        if (aInfo.latestTransactionDate && !bInfo.latestTransactionDate)
          return -1;
        if (!aInfo.latestTransactionDate && bInfo.latestTransactionDate)
          return 1;
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      case "recent-customers":
        const aDate = new Date(a.updated_at || a.created_at);
        const bDate = new Date(b.updated_at || b.created_at);
        return bDate.getTime() - aDate.getTime();

      case "name":
        return a.name.localeCompare(b.name);

      default:
        return 0;
    }
  });

  // Pagination logic
  const startIndex = (currentPage - 1) * customersPerPage;
  const endIndex = startIndex + customersPerPage;
  const paginatedCustomers = sortedCustomers.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedCustomers.length / customersPerPage);

  const displayedCustomers = paginatedCustomers;

const handleDeleteCustomer = async (customerId: string) => {
  if (!window.confirm("هل أنت متأكد من حذف العميل و جميع المعاملات المرتبطة به؟")) return;

  try {
    //  Fetch the exact customer name
    const { data: customerData, error: fetchError } = await supabase
      .from("customers")
      .select("name")
      .eq("id", customerId)
      .single();

    if (fetchError) throw fetchError;
    if (!customerData) {
      console.error("Customer not found for ID:", customerId);
      alert("Customer not found!");
      return;
    }

    const customerName = customerData.name;
    console.log("Customer name fetched:", customerName);

    // : Delete related transactions
    const { error: transactionsError } = await supabase
      .from("transactions")
      .delete()
      .eq("CustomerName", customerName);

    if (transactionsError) throw transactionsError;
    console.log("Deleted transactions for customer:", customerName);

    //  Delete related customer accounts
    const { error: accountsError } = await supabase
      .from("customers_accounts")
      .delete()
      .eq("customer", customerName);

    if (accountsError) throw accountsError;
    console.log("Deleted customer accounts for customer:", customerName);

    //  Delete related backups
    const { error: backupsError } = await supabase
      .from("customer_backups")
      .delete()
      .eq("customer_id", customerId);

    if (backupsError) throw backupsError;
    console.log("Deleted customer backups for ID:", customerId);

    //  Delete the customer itself
    const { error: customerError } = await supabase
      .from("customers")
      .delete()
      .eq("id", customerId);

    if (customerError) throw customerError;
    console.log("Deleted customer:", customerName);

    //  Update UI
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    alert("تم حذف العميل و جميع المعاملات المرتبطة به بنجاح");

  } catch (error) {
    console.error("Delete failed:", error);
    alert("Delete failed. Make sure related data is handled.");
  }
};






  // Format date for display with English numbers
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleCustomerClick = (customerName: string) => {
    const customer = customers.find((c) => c.name === customerName);
    if (customer) {
      setSelectedCustomer(customer);
      setIsReportOpen(true);
    }
  };

  // Condensed Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    // Function to handle page click
    const handlePageClick = (page: number) => {
      setCurrentPage(page);
    };

    // Condensed pagination algorithm
    const getPageNumbers = () => {
      const pages: (number | string)[] = [];
      
      if (totalPages <= 7) {
        // Show all pages if 7 or fewer
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      
      if (currentPage === 1) {
        // On first page, show: 1 2 3 ... total
        pages.push(1);
        if (totalPages > 1) pages.push(2);
        if (totalPages > 2) pages.push(3);
        if (totalPages > 3) pages.push("...");
        if (totalPages > 1) pages.push(totalPages);
      } else if (currentPage === totalPages) {
        // On last page, show: 1 ... total-2 total-1 total
        pages.push(1);
        if (totalPages > 2) pages.push("...");
        if (totalPages > 2) pages.push(totalPages - 2);
        if (totalPages > 1) pages.push(totalPages - 1);
        pages.push(totalPages);
      } else {
        // Middle pages: 1 ... X-1 X X+1 ... total
        pages.push(1);
        if (currentPage > 3) pages.push("...");
        if (currentPage > 2) pages.push(currentPage - 1);
        pages.push(currentPage);
        if (currentPage < totalPages - 1) pages.push(currentPage + 1);
        if (currentPage < totalPages - 2) pages.push("...");
        pages.push(totalPages);
      }
      
      return pages;
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-2 sm:px-4">
        {/* Results Count */}
        <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
          عرض {startIndex + 1}-{Math.min(endIndex, sortedCustomers.length)} من
          أصل {sortedCustomers.length} عميل
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center gap-1 sm:gap-3 w-full sm:w-auto justify-center">
          {/* Previous Button - Bigger and Bolder */}
          <Button
            onClick={() => {
              const newPage = Math.max(currentPage - 1, 1);
              handlePageClick(newPage);
            }}
            disabled={currentPage === 1}
            variant="outline"
            className="h-10 w-10 sm:h-12 sm:w-12 p-0 flex items-center justify-center border-2 border-gray-300 hover:border-[#212E5B] transition-colors flex-shrink-0"
            size="sm"
          >
            <ChevronRight
              className="w-5 h-5 sm:w-6 sm:h-6 font-bold"
              strokeWidth={3}
            />
          </Button>

          {/* Condensed Page Numbers Container */}
          <div
            className="flex items-center gap-1 flex-wrap justify-center"
            dir="rtl"
          >
            {getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-2 py-1 text-gray-500 text-sm"
                  >
                    ...
                  </span>
                );
              }
              
              const pageNum = page as number;
              const isCurrentPage = pageNum === currentPage;
              
              return (
                <Button
                  key={pageNum}
                  onClick={() => handlePageClick(pageNum)}
                  variant={isCurrentPage ? "default" : "outline"}
                  className={`h-8 w-8 sm:h-9 sm:w-9 min-w-[2rem] sm:min-w-[2.25rem] p-0 text-xs sm:text-sm font-bold flex-shrink-0 transition-all ${
                    isCurrentPage
                      ? "bg-[#212E5B] text-white border-[#212E5B] scale-105"
                      : "border-gray-300 hover:border-[#212E5B] hover:scale-105"
                  }`}
                  size="sm"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          {/* Next Button - Bigger and Bolder */}
          <Button
            onClick={() => {
              const newPage = Math.min(currentPage + 1, totalPages);
              handlePageClick(newPage);
            }}
            disabled={currentPage === totalPages}
            variant="outline"
            className="h-10 w-10 sm:h-12 sm:w-12 p-0 flex items-center justify-center border-2 border-gray-300 hover:border-[#212E5B] transition-colors flex-shrink-0"
            size="sm"
          >
            <ChevronLeft
              className="w-5 h-5 sm:w-6 sm:h-6 font-bold"
              strokeWidth={3}
            />
          </Button>
        </div>

        {/* Page Size Info - Hidden on mobile, shown on sm and up */}
        <div className="text-xs text-gray-500 hidden sm:block">
          {customersPerPage} عملاء في الصفحة
        </div>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#F8F5F0] via-white to-[#F8F5F0] relative"
      dir="rtl"
    >
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20 relative z-10"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Link to="/" className="flex-shrink-0">
                <img
                  src="/applogo.png"
                  alt="App Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain"
                />
              </Link>
              <div className="text-center sm:text-right">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  نظام المعاملات المالية
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  مرحباً، {user?.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Link to="/" className="w-full sm:w-auto">
                <Button
                  style={{
                    background: "linear-gradient(to right, #212E5B, #4B5472)",
                  }}
                  className="flex items-center justify-center gap-2 py-2 sm:py-3 w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">الصفحة الرئيسية</span>
                  <span className="sm:hidden">الرئيسية</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={signOut}
                className="flex items-center justify-center gap-2 py-2 sm:py-3 w-full sm:w-auto text-xs sm:text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
                <span className="sm:hidden">خروج</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 relative z-0">
        {/* Action Buttons Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative z-[9999] flex flex-col sm:flex-row gap-3 w-full justify-center">
              <CustomerDialog
                onCustomerAdded={refreshCustomers}
                className="z-[10000]"
              />
              <Button
                variant="primary"
                onClick={() => setIsCompanyReportOpen(true)}
                className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white w-full sm:w-auto px-4 sm:px-6 py-3 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
              >
                <Building className="w-4 h-4 sm:w-5 sm:h-5" />
                تقرير الشركة
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6 relative">
          {/* Table Header */}
          <div className="bg-gradient-to-r from-[#212E5B] to-[#4B5472] p-4">
            <h2 className="text-white text-lg sm:text-xl font-bold text-center">
              العملاء
            </h2>
          </div>

          {/* Search and Filters */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="space-y-4">
              {/* Search Input */}
              <div className="max-w-md mx-auto relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <input
                  type="text"
                  placeholder="ابحث عن عميل"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white shadow-lg rounded-lg sm:rounded-xl border border-gray-300 focus:outline-none focus:border-[#212E5B] focus:ring-2 focus:ring-[#868EAA] transition-all duration-300 pl-10 pr-3 sm:pr-4 py-2 sm:py-3 text-gray-800 font-medium text-right placeholder-gray-400 text-sm sm:text-base"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                {/* Sort Filter */}
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      ترتيب حسب:
                    </span>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right w-full lg:w-auto"
                  >
                    <option value="recent-transactions">أحدث المعاملات</option>
                    <option value="recent-customers">المضافين حديثاً</option>
                    <option value="name">حسب الإسم</option>
                  </select>
                </div>

                {/* Date Range Filter */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white p-3 sm:p-4 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 w-full lg:w-auto">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
                      من:
                    </label>
                    <DatePicker
                      selected={dateFrom}
                      onChange={setDateFrom}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="يوم/شهر/سنة"
                      locale={ar}
                      className="w-full sm:w-32 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-xs sm:text-sm"
                      isClearable
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">
                      إلى:
                    </label>
                    <DatePicker
                      selected={dateTo}
                      onChange={setDateTo}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="يوم/شهر/سنة"
                      locale={ar}
                      className="w-full sm:w-32 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-xs sm:text-sm"
                      isClearable
                    />
                  </div>

                  {(dateFrom || dateTo) && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setDateFrom(null);
                        setDateTo(null);
                      }}
                      className="text-red-500 hover:text-red-700 w-full sm:w-auto text-xs"
                      variant="ghost"
                    >
                      مسح التاريخ
                    </Button>
                  )}
                </div>
              </div>

              {/* Active Filters Display */}
              <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                {sortBy === "recent-transactions" && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs">
                    أحدث المعاملات
                  </span>
                )}
                {sortBy === "recent-customers" && (
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs">
                    المضافين حديثاً
                  </span>
                )}
                {sortBy === "name" && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs">
                    حسب الإسم
                  </span>
                )}
                {dateFrom && (
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs">
                    من: {formatDate(dateFrom.toISOString())}
                  </span>
                )}
                {dateTo && (
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-xs">
                    إلى: {formatDate(dateTo.toISOString())}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#212E5B] mx-auto"></div>
              <p className="text-gray-600 mt-3">جاري تحميل العملاء...</p>
            </div>
          )}

          {/* Customers Table/Cards */}
          {!loading && (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-0 text-white bg-gradient-to-r from-[#212E5B] to-[#4B5472]">
                    <tr>
                      {/* Centered Customer Name Header */}
                      <th className="p-4 text-center text-sm font-semibold">
                        إسم العميل
                      </th>
                      <th className="p-4 text-center text-sm font-semibold">
                        إجمالي المعاملات
                      </th>
                      <th className="p-4 text-center text-sm font-semibold">
                        آخر معاملة
                      </th>
                      <th className="p-4 text-center text-sm font-semibold">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedCustomers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="text-gray-500 text-center py-8 text-sm"
                        >
                          {search ? "لا توجد نتائج للبحث" : "لا يوجد عملاء"}
                        </td>
                      </tr>
                    ) : (
                      displayedCustomers.map((customer, index) => {
                        const { totalTransactionCount, latestTransactionDate } =
                          getCustomerTransactionInfo(customer.name);

                        return (
                          <tr
                            key={customer.id}
                            className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-gray-50" : "bg-white"
                              }`}
                          >
                            {/* Centered Customer Name Cell */}
                            <td className="border-t p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span
                                  className="cursor-pointer hover:underline font-medium text-gray-900 text-center"
                                  onClick={() => {
                                    setSelectedCustomer(customer);
                                    setIsReportOpen(true);
                                  }}
                                >
                                  {customer.name}
                                </span>
                                {transactions.some(
                                  (t) => t.CustomerName === customer.name
                                ) && (
                                    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex-shrink-0">
                                      <ArrowUpDown className="w-3 h-3" />
                                      {
                                        transactions.filter(
                                          (t) => t.CustomerName === customer.name
                                        ).length
                                      }
                                    </span>
                                  )}
                              </div>
                            </td>

                            <td className="border-t p-4 text-center text-sm font-medium text-gray-700">
                              {totalTransactionCount}
                            </td>

                            <td className="border-t p-4 text-center text-sm font-mono text-gray-600">
                              {latestTransactionDate
                                ? formatDate(latestTransactionDate)
                                : "-"}
                            </td>
                            <td className="border-t p-4">
                              <div className="flex justify-center gap-2">
                                <Button
                                  className="flex items-center gap-2 border-[#212E5B] text-[#212E5B] hover:bg-[#CED2E0] text-sm px-3 py-2"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCustomer(customer);
                                    setIsReportOpen(true);
                                  }}
                                >
                                  <FileText className="w-4 h-4" />
                                  تقرير
                                </Button>
                                <Button
                                  className="flex items-center gap-2 border-green-500 text-green-500 hover:bg-green-100 text-sm px-3 py-2"
                                  variant="outline"
                                  onClick={() => {
                                    navigate(
                                      `/customer-profile/${customer.id}`,
                                      {
                                        state: { customer },
                                      }
                                    );
                                  }}
                                >
                                  <User className="w-4 h-4" />
                                  ملف
                                </Button>
                                <Button
                                  className="flex trash items-center gap-2 border-[#212E5B] text-[#212E5B] hover:border-red-600 hover:text-red-600 hover:bg-red-50 text-sm px-3 py-2"
                                  variant="outline"
                                  onClick={() =>
                                    handleDeleteCustomer(customer.id)
                                  }
                                >
                                  <Trash2 className="w-4 h-4 trash-icon" />
                                  حذف
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4 p-3 sm:p-4">
                {displayedCustomers.length === 0 ? (
                  <div className="text-gray-500 text-center py-8 text-sm">
                    {search ? "لا توجد نتائج للبحث" : "لا يوجد عملاء"}
                  </div>
                ) : (
                  displayedCustomers.map((customer) => {
                    const { totalTransactionCount, latestTransactionDate } =
                      getCustomerTransactionInfo(customer.name);

                    return (
                      <div
                        key={customer.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 text-center">
                            <h3 className="text-base font-semibold text-gray-900 mb-2">
                              {customer.name}
                            </h3>
                            <div className="flex items-center gap-2 flex-wrap justify-center">
                              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                                إجمالي المعاملات: {totalTransactionCount}
                              </span>
                              {transactions.some(
                                (t) => t.CustomerName === customer.name
                              ) && (
                                  <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                    <ArrowUpDown className="w-3 h-3" />
                                    {
                                      transactions.filter(
                                        (t) => t.CustomerName === customer.name
                                      ).length
                                    }
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        {latestTransactionDate && (
                          <div className="text-xs text-gray-500 mb-3 font-mono text-center">
                            آخر معاملة: {formatDate(latestTransactionDate)}
                          </div>
                        )}

                        <div className="flex flex-col gap-2">
                          <Button
                            className="flex items-center justify-center gap-2 border-[#212E5B] text-[#212E5B] hover:bg-[#CED2E0] text-sm py-2"
                            variant="outline"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsReportOpen(true);
                            }}
                          >
                            <FileText className="w-4 h-4" />
                            تقرير العميل
                          </Button>
                          <Button
                            className="flex items-center justify-center gap-2 border-green-500 text-green-500 hover:bg-green-100 text-sm py-2"
                            variant="outline"
                            onClick={() => {
                              navigate(`/customer-profile/${customer.id}`, {
                                state: { customer },
                              });
                            }}
                          >
                            <User className="w-4 h-4" />
                            الملف الشخصي
                          </Button>
                          <Button
                            className="flex trash items-center justify-center gap-2 border-[#212E5B] text-[#212E5B] hover:border-red-600 hover:text-red-600 hover:bg-red-50 text-sm py-2"
                            variant="outline"
                            onClick={() => handleDeleteCustomer(customer.id)}
                          >
                            <Trash2 className="w-4 h-4 trash-icon" />
                            حذف العميل
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}

          {/* Pagination */}
          {!loading && displayedCustomers.length > 0 && <Pagination />}
        </div>
      </div>

      {/* Individual Customer Report Modal */}
      {selectedCustomer && (
        <ReportGenerator
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          allTransactions={transactions.filter(
            (t) =>
              (!dateFrom ||
                new Date(t.created_at) >=
                new Date(dateFrom.setHours(0, 0, 0, 0))) &&
              (!dateTo ||
                new Date(t.created_at) <=
                new Date(dateTo.setHours(23, 59, 59, 999)))
          )}
          selectedTransaction={
            { CustomerName: selectedCustomer.name } as Transaction
          }
        />
      )}

      {/* Company Report Modal */}
      {isCompanyReportOpen && (
        <CompanyReport
          isOpen={isCompanyReportOpen}
          onClose={() => setIsCompanyReportOpen(false)}
          allTransactions={transactions.filter(
            (t) =>
              (!dateFrom ||
                new Date(t.created_at) >=
                new Date(dateFrom.setHours(0, 0, 0, 0))) &&
              (!dateTo ||
                new Date(t.created_at) <=
                new Date(dateTo.setHours(23, 59, 59, 999)))
          )}
          onCustomerClick={handleCustomerClick}
        />
      )}

      <style jsx>{`
        .trash-icon {
          color: #212e5b;
        }
        .trash:hover .trash-icon {
          color: #dc2626;
        }
      `}</style>

      {/* Add custom CSS for scrollbar hiding */}
      <style jsx global>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
