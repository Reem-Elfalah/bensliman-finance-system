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
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const navigate = useNavigate();

  const filteredTransactions = userTransactions.filter((t) => {
    const trxDate = new Date(t.created_at).toISOString().split("T")[0];
    if (dateFrom && dateTo) return trxDate >= dateFrom && trxDate <= dateTo;
    if (dateFrom) return trxDate >= dateFrom;
    if (dateTo) return trxDate <= dateTo;
    return true;
  });



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
      from_account: data.from_account ?? "",
      from_account_name: data.from_account_name ?? "",
      to_account: data.to_account ?? "",
      to_account_name: data.to_account_name ?? "",
      ReferenceName: data.ReferenceName ?? "",
      amount: data.amount ?? 0,
      currency: data.currency ?? "LYD",
      notes: data.notes ?? "",
      country_city: data.country_city ?? "Unknown",
      paper_category: data.paper_category ?? "General",
      price: data.price ?? 0,
      fee: data.fee ?? 0,
      fee_currency: data.fee_currency ?? "LYD",
      category: data.category ?? "Deposit",
      fx_base_currency: data.fx_base_currency ?? "",
      fx_base_amount: data.fx_base_amount ?? 0,
      fx_quote_currency: data.fx_quote_currency ?? "",
      fx_quote_amount: data.fx_quote_amount ?? 0,
      fx_direction: data.fx_direction,
      rate: data.rate ?? 0,
      deliver_to: data.deliver_to ?? "",
      CustomerName: data.CustomerName ?? "",
      beneficiary: data.beneficiary ?? "",
      Treasury: data.Treasury ?? null,
      customerAccount: data.customerAccount ?? null,
      currency_final: data.currency_final  ?? "الدينار الليبي",
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
          {transactionTypes.map((type) => (
            <Card key={type.key} className="p-4 sm:p-6" hover>
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
            </Card>
          ))}
        </motion.div>

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
                {dateFrom || dateTo
                  ? `من ${dateFrom || "..."} إلى ${dateTo || "..."}`
                  : "الأخيرة"}
                <span className="text-sm text-gray-500 mr-2">
                  (
                  {dateFrom || dateTo
                    ? filteredTransactions.length
                    : totalCount}
                  )
                </span>
              </h2>
            </div>

            <div className="overflow-x-auto">
              <TransactionList
                transactions={filteredTransactions}
                loading={transactionsLoading}
              />
            </div>

            {/* Pagination Controls */}
            {totalCount > 10 && (
              <div className="flex flex-wrap justify-center items-center mt-4 gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  size="sm"
                  className="text-sm"
                >
                  السابق
                </Button>

                {Array.from({ length: Math.ceil(totalCount / 10) }, (_, i) => (
                  <Button
                    key={i + 1}
                    variant={page === i + 1 ? "primary" : "outline"}
                    onClick={() => setPage(i + 1)}
                    size="sm"
                    className="text-sm min-w-[40px]"
                  >
                    {i + 1}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  disabled={page === Math.ceil(totalCount / 10)}
                  onClick={() => setPage((p) => p + 1)}
                  size="sm"
                  className="text-sm"
                >
                  التالي
                </Button>
              </div>
            )}
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