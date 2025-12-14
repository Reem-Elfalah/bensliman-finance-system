// src/pages/dashboard.tsx
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import {
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowUpLeft,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { TransactionList } from "../transactions/TransactionList";
import { CompanyReport } from "../Reports/CompanyReport";
import { ReportGenerator } from "../Reports/reports";
import { useTransactions } from "../../hooks/useTransactions";
import { useAuth } from "../../hooks/useAuth";
import { Wizard, TransactionInsert } from "../wizard/Wizard";
import { AccountDialog } from "../AccountDialog";
import { CustomerDialog } from "../CustomerDialog";
import { useNavigate } from "react-router-dom";
import { Users, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import DatePicker, { registerLocale } from "react-datepicker";
import ar from "date-fns/locale/ar";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("ar", ar);

export function Dashboard() {
  const { user, signOut } = useAuth();
  const [page, setPage] = useState(1);
  const {
    transactions: userTransactions,
    loading: transactionsLoading,
    addTransaction: addTransactionToDb,
    totalCount,
  } = useTransactions(user?.id, page, 10);

  const [showForm, setShowForm] = useState(false);
  const [showCompanyReport, setShowCompanyReport] = useState(false);
  const [showUserReport, setShowUserReport] = useState(false);
  const [userReportTransaction, setUserReportTransaction] = useState<
    any | null
  >(null);
  const [selectedType, setSelectedType] = useState<
    "exit" | "sell_to" | "buy" | "entry"
  >("exit");
  const [filterType, setFilterType] = useState<
    "exit" | "sell_to" | "buy" | "entry" | null
  >(null);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allUserTransactions, setAllUserTransactions] = useState<any[]>([]);
  const [loadingAllUser, setLoadingAllUser] = useState(false);

  const navigate = useNavigate();

  // Fetch all user transactions when filtering is active (type or date)
  useEffect(() => {
    const hasFilters = filterType || dateFrom || dateTo;
    if (hasFilters && user?.id) {
      setLoadingAllUser(true);
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching all user transactions:", error);
            setAllUserTransactions([]);
          } else {
            setAllUserTransactions(data || []);
          }
          setLoadingAllUser(false);
        });
    } else {
      setAllUserTransactions([]);
    }
    // Reset page when filter changes
    setPage(1);
  }, [filterType, dateFrom, dateTo, user?.id]);

  // Determine which transactions to use and apply filtering
  const hasFilters = filterType || dateFrom || dateTo;
  const transactionsToFilter = hasFilters ? allUserTransactions : userTransactions;
  const pageSize = 10;

  const filteredTransactions = transactionsToFilter.filter((t) => {
    // Filter by type if selected
    if (filterType && t.type !== filterType) {
      return false;
    }
    // Filter by date based on created_at
    if (dateFrom || dateTo) {
      const trxDate = new Date(t.created_at).toISOString().split("T")[0];
      if (dateFrom && dateTo) {
        if (!(trxDate >= dateFrom && trxDate <= dateTo)) return false;
      } else if (dateFrom) {
        if (!(trxDate >= dateFrom)) return false;
      } else if (dateTo) {
        if (!(trxDate <= dateTo)) return false;
      }
    }
    return true;
  });

  // Calculate pagination for filtered results
  const filteredTotalCount = filteredTransactions.length;
  const filteredPageCount = Math.ceil(filteredTotalCount / pageSize);
  const paginatedFilteredTransactions = hasFilters
    ? filteredTransactions.slice((page - 1) * pageSize, page * pageSize)
    : filteredTransactions;

  // Use filtered pagination when filtering, otherwise use server pagination
  const displayTransactions = hasFilters ? paginatedFilteredTransactions : filteredTransactions;
  const displayTotalCount = hasFilters ? filteredTotalCount : totalCount;
  const displayLoading = hasFilters ? loadingAllUser : transactionsLoading;



  const stats = {
    total: allTransactions.reduce(
      (sum, t) => sum + (t.amount ?? 0) + (t.fee ?? 0),
      0
    ),
    exits: allTransactions.filter((t) => t.type === "exit").length,
    sales: allTransactions.filter((t) => t.type === "sell_to").length,
    purchases: allTransactions.filter((t) => t.type === "buy").length,
    entries: allTransactions.filter((t) => t.type === "entry").length,
  };



  const transactionTypes = [
    {
      key: "exit" as const,
      label: "خروج",
      icon: ArrowUpRight,
      color: "text-white",
    },
    {
      key: "sell_to" as const,
      label: "بيع الي",
      icon: ArrowDownLeft,
      color: "text-white",
    },
    {
      key: "buy" as const,
      label: "شراء",
      icon: ArrowUpLeft,
      color: "text-white",
    },
    {
      key: "entry" as const,
      label: "دخول",
      icon: Activity,
      color: "text-white",
    },
  ];

  const handleAddTransaction = async (
    data: TransactionInsert
  ): Promise<{ error: string | null }> => {
    if (!user?.id) return { error: "User not authenticated" };

    const transactionPayload = {
      customer_id: data.customer_id ?? null,
      user_id: user.id,
      type: selectedType,
      to_account_name: data.to_account_name ?? "",
      amount: data.amount ?? 0,
      currency: data.currency ?? "LYD",
      notes: data.notes ?? "",
      country_city: data.country_city ?? "Unknown",
      paper_category: data.paper_category ?? "General",
      price: data.price ?? 0,
      fee: data.fee ?? 0,
      fee_currency: data.fee_currency ?? "LYD",
      category: data.category ?? "Deposit",
      rate: data.rate ?? 0,
      deliver_to: data.deliver_to ?? "",
      CustomerName: data.CustomerName ?? "",
      customerAccount: data.customerAccount ?? null,
      currency_final: data.currency_final  ?? "الدينار الليبي",
      conversion_method: data.conversion_method ?? "MULTIPLY",
    };

    console.log(" Transaction payload with Treasury:", transactionPayload);

    const { data: trx, error: trxError } = await addTransactionToDb(
      transactionPayload
    );
    if (trxError || !trx) {
      console.error("Error adding transaction:", trxError);
      return { error: trxError?.message || "Unknown error" };
    }

    console.log(" Transaction saved successfully:", trx);

    if (transactionPayload.fx_base_currency) {
      // FX transaction handling (commented out as in your original code)
    }

    setShowForm(false);
    return { error: null };
  };

  // Fetch all transactions for company report
  useEffect(() => {
    if (showCompanyReport) {
      setLoadingAll(true);
      supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching all transactions:", error);
            setAllTransactions([]);
          } else {
            setAllTransactions(data || []);
          }
          setLoadingAll(false);
        });
    }
  }, [showCompanyReport]);

  useEffect(() => {
    // Fetch all transactions for stats
    const fetchAllTransactions = async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*") // all columns
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching all transactions:", error);
        setAllTransactions([]);
      } else {
        setAllTransactions(data || []);
      }
    };

    fetchAllTransactions();
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50">
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <Link to="/" className="flex-shrink-0">
                <img
                  src="/applogo.png"
                  alt="App Logo"
                  className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 object-contain"
                />
              </Link>
              <div className="text-center sm:text-right">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  نظام المعاملات المالية
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  مرحباً، {user?.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => navigate("/customers")}
                style={{
                  background: "linear-gradient(to right, #212E5B, #4B5472)",
                }}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <Users size={18} />
                العملاء
              </Button>
              <Button
                onClick={() => navigate("/treasury")}
                style={{
                  background: "linear-gradient(to right, #212E5B, #4B5472)",
                }}
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                <CreditCard size={18} />
                الخزائن
              </Button>
              <Button
                variant="outline"
                onClick={signOut}
                className="w-full sm:w-auto"
              >
                تسجيل الخروج
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Stats Cards */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8"
        >
          {transactionTypes.map((type) => {
            const isFiltered = filterType === type.key;
            return (
              <Card
                key={type.key}
                className={`p-4 sm:p-6 cursor-pointer transition-all ${
                  isFiltered
                    ? "ring-4 ring-blue-500 bg-blue-50 border-blue-300"
                    : "hover:shadow-lg"
                }`}
                hover
                onClick={() => {
                  // Toggle filter: if already filtered by this type, clear it; otherwise set it
                  if (isFiltered) {
                    setFilterType(null);
                  } else {
                    setFilterType(type.key);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <type.icon
                        className={`h-6 w-6 sm:h-8 sm:w-8 ${type.color}`}
                      />
                    </div>
                    <div className="mr-3 sm:mr-4 ml-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">
                        {type.label}
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-gray-900">
                        {
                          stats[
                          type.key === "sell_to"
                            ? "sales"
                            : type.key === "buy"
                              ? "purchases"
                              : type.key === "entry"
                                ? "entries"
                                : "exits"
                          ]
                        }
                      </p>
                    </div>
                  </div>
                  {isFiltered && (
                    <div className="flex-shrink-0">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </motion.div>
        
        {/* Filter Indicator */}
        {filterType && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <Card className="p-3 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-center gap-3">
                <span className="text-sm font-medium text-gray-700">
                  يتم عرض: {transactionTypes.find((t) => t.key === filterType)?.label}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterType(null)}
                  className="text-red-500 text-sm"
                >
                  إزالة الفلتر
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 sm:mb-8"
        >
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                <CustomerDialog />
                {/* <AccountDialog /> */}
                <Button
                  variant="primary"
                  onClick={() => setShowCompanyReport(true)}
                  className="flex items-center justify-center gap-2 bg-blue-700 text-white w-full sm:w-auto"
                >
                  تقرير الشركة
                </Button>
              </div>
            </div>
          </Card>

          <br />

          <Card className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              {/* Date Filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 relative z-50">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    من:
                  </label>
                  <DatePicker
                    selected={dateFrom ? new Date(dateFrom) : null}
                    onChange={(date: Date | null) => {
                      if (dateTo && date && date > new Date(dateTo)) {
                        alert(
                          "تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية"
                        );
                        return;
                      }
                      setDateFrom(date ? date.toISOString().split("T")[0] : "");
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="يوم/شهر/سنة"
                    locale="ar"
                    showMonthDropdown={false}
                    showYearDropdown={false}
                    inline={false}
                    className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    popperClassName="z-[9999]"
                    portalId="root-portal"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    إلى:
                  </label>
                  <DatePicker
                    selected={dateTo ? new Date(dateTo) : null}
                    onChange={(date: Date | null) => {
                      if (dateFrom && date && date < new Date(dateFrom)) {
                        alert(
                          "تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية"
                        );
                        return;
                      }
                      setDateTo(date ? date.toISOString().split("T")[0] : "");
                    }}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="يوم/شهر/سنة"
                    locale="ar"
                    showMonthDropdown={false}
                    showYearDropdown={false}
                    dropdownMode="select"
                    className="w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    popperClassName="z-[9999]"
                    portalId="root-portal"
                  />
                </div>

                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                    className="text-red-500 w-full sm:w-auto"
                  >
                    مسح الفلتر
                  </Button>
                )}
              </div>

              {/* Transaction Type Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {transactionTypes.map((type) => (
                  <Button
                    key={type.key}
                    variant="outline"
                    icon={type.icon}
                    onClick={() => {
                      setSelectedType(type.key);
                      setShowForm(true);
                    }}
                    className="justify-center sm:justify-start text-sm"
                  >
                    <span className="hidden sm:inline">{type.label}</span>
                    <span className="sm:hidden">{type.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                المعاملات{" "}
                {filterType && (
                  <span className="text-blue-600">
                    ({transactionTypes.find((t) => t.key === filterType)?.label})
                  </span>
                )}{" "}
                {dateFrom || dateTo
                  ? `من ${dateFrom || "..."} إلى ${dateTo || "..."}`
                  : "الأخيرة"}
                <span className="text-sm text-gray-500 mr-2">
                  ({displayTotalCount})
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <TransactionList
                transactions={displayTransactions}
                loading={displayLoading}
              />
            </div>

            {/* Pagination Controls */}
            {displayTotalCount > 10 && (() => {
              const totalPages = hasFilters 
                ? filteredPageCount 
                : Math.ceil(displayTotalCount / 10);
              
              // Condensed pagination algorithm
              const getPaginationPages = (current: number, total: number): (number | string)[] => {
                const pages: (number | string)[] = [];
                
                if (total <= 7) {
                  return Array.from({ length: total }, (_, i) => i + 1);
                }
                
                // Always show first page
                if (current === 1) {
                  // On first page, show: 1 2 3 ... total
                  pages.push(1);
                  if (total > 1) pages.push(2);
                  if (total > 2) pages.push(3);
                  if (total > 3) pages.push("...");
                  if (total > 1) pages.push(total);
                } else if (current === total) {
                  // On last page, show: 1 ... total-2 total-1 total
                  pages.push(1);
                  if (total > 2) pages.push("...");
                  if (total > 2) pages.push(total - 2);
                  if (total > 1) pages.push(total - 1);
                  pages.push(total);
                } else {
                  // Middle pages: 1 ... X-1 X X+1 ... total
                  pages.push(1);
                  if (current > 3) pages.push("...");
                  if (current > 2) pages.push(current - 1);
                  pages.push(current);
                  if (current < total - 1) pages.push(current + 1);
                  if (current < total - 2) pages.push("...");
                  pages.push(total);
                }
                
                return pages;
              };
              
              const paginationPages = getPaginationPages(page, totalPages);
              
              return (
                <div className="flex flex-wrap justify-center items-center mt-4 gap-2" dir="rtl">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    size="sm"
                    className="text-sm"
                  >
                    Previous
                  </Button>

                  {paginationPages.map((pageNum, index) => {
                    if (pageNum === "...") {
                      return (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-2 text-gray-500 text-sm"
                        >
                          ...
                        </span>
                      );
                    }
                    
                    const pageNumber = pageNum as number;
                    const isCurrentPage = pageNumber === page;
                    
                    return (
                      <Button
                        key={pageNumber}
                        variant={isCurrentPage ? "primary" : "outline"}
                        onClick={() => setPage(pageNumber)}
                        size="sm"
                        className="text-sm min-w-[40px]"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}

                  <Button
                    variant="outline"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    size="sm"
                    className="text-sm"
                  >
                    Next
                  </Button>
                </div>
              );
            })()}
          </Card>
        </motion.div>
      </div>

      {/* Wizard Modal */}
      {showForm && (
        <Wizard
          isOpen={true}
          onClose={() => setShowForm(false)}
          initialType={selectedType}
          onSubmit={handleAddTransaction}
        />
      )}

      {/* Company Report Modal */}
      {showCompanyReport && (
        <CompanyReport
          isOpen={showCompanyReport}
          onClose={() => setShowCompanyReport(false)}
          allTransactions={allTransactions}
          onCustomerClick={(customerName: string) => {
            const trx = allTransactions.find(
              (t) => t.CustomerName === customerName
            );
            if (trx) {
              setUserReportTransaction(trx);
              setShowUserReport(true);
            }
          }}
        />
      )}

      {showUserReport && userReportTransaction && (
        <ReportGenerator
          isOpen={showUserReport}
          onClose={() => setShowUserReport(false)}
          selectedTransaction={userReportTransaction}
          allTransactions={allTransactions}
        />
      )}
    </div>
  );
}