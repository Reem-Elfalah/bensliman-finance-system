// src/Reports/ReportGenerator.tsx
import { useRef, useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Download, Printer, X, RefreshCcw, Filter } from "lucide-react";
import { Button } from "../ui/Button";
import { useReactToPrint } from "react-to-print";
import { PDFDownloadLink } from "@react-pdf/renderer";
import DatePicker, { registerLocale } from "react-datepicker";
import ar from "date-fns/locale/ar";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "../../lib/supabase";
import { PrintableReport } from "./PrintableReport";
import { PDFReport } from "./PDFReport";

// Patch Transaction type to allow Treasury property
type TransactionWithTreasury = Transaction & {
  Treasury?: string;
  account?: string;
  customerAccount?: { name: string; account: string; currency: string };
};

registerLocale("ar", ar);

export interface Transaction {
  currency_final ?: string;
  id: string;
  type: "exit" | "sell_to" | "buy" | "entry";
  created_at: string;
  amount: number;
  country_city: string;
  paper_category: string;
  price: number;
  currency: string;
  to_account_name?: string;
  deliver_to?: string;
  notes?: string;
  category?: string;
  CustomerName?: string;
  fee?: number;
  fee_currency?: string;
  rate?: number;
  Treasury?: string;
  fx_final_amount?: number;
}

interface ClientReportProps {
  allTransactions?: TransactionWithTreasury[];
  selectedTransaction?: Transaction;
  // allTransactions?: Transaction[];
  isOpen: boolean;
  onClose: () => void;
  customerAccounts: CustomerAccount[];

}

interface CustomerAccount {
  id: string;
  customer: string;
  account: string;
  currency: string;
}


export function ReportGenerator({
  selectedTransaction,
  allTransactions,
  isOpen,
  onClose,
  customerAccounts
}: ClientReportProps) {

  const transactionsWithAccounts: TransactionWithTreasury[] = useMemo(() => {
    return (allTransactions || []).map(t => {
      const customerAccount = t.customerAccount || {
        name: t.CustomerName || "غير محدد",
        account: "Unknown",
        currency: "",
      };

      return {
        ...t,
        customerAccount,
      };
    });
  }, [allTransactions]);


  const printRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [availableAccounts, setAvailableAccounts] = useState<string[]>([]);
  const [customerAccountsMap, setCustomerAccountsMap] = useState<{ [customer: string]: string }>({});

  type Currency = {
    id: number;
    code: string;
    symbol: string;
    name: string;
  };

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedTransactionType, setSelectedTransactionType] =
    useState<string>("");
  const [shouldGeneratePDF, setShouldGeneratePDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const hasTriggeredDownload = useRef(false);
  
  const resetPdfState = () => {
    setShouldGeneratePDF(false);
    setPdfUrl(null);
    setIsPdfLoading(false);
    hasTriggeredDownload.current = false;
  };


  const transactionTypeOptions = [
    { value: "", label: "جميع أنواع المعاملات" },
    { value: "entry", label: "الإيداع / دخول" },
    { value: "exit", label: "السحب / خروج" },
    { value: "buy", label: "عمليات الشراء" },
    { value: "sell_to", label: "بيع الي" },
    { value: "transfer", label: "تحويل" },
  ];

  const clientTransactions = useMemo(() => {
    if (!allTransactions || !selectedTransaction) return [];

    return allTransactions.filter((t) => {
      if (t.CustomerName !== selectedTransaction.CustomerName) return false;

      const createdDate = new Date(t.created_at);
      if (fromDate && createdDate < fromDate) return false;
      if (toDate && createdDate > toDate) return false;

      if (selectedCurrency) {
        const hasCurrency =
          t.currency === selectedCurrency ||
          t.fx_base_currency === selectedCurrency ||
          t.fx_quote_currency === selectedCurrency;
        if (!hasCurrency) return false;
      }

      if (selectedAccount) {
        const isAccountInvolved =
          t.from_account_name === selectedAccount ||
          t.to_account_name === selectedAccount ||
          t.deliver_to === selectedAccount;
        if (!isAccountInvolved) return false;
      }

      if (selectedTransactionType) {
        if (selectedTransactionType === "transfer") {
          if (t.category !== "Transfer") return false;
        } else if (
          selectedTransactionType === "buy" ||
          selectedTransactionType === "sell_to"
        ) {
          if (t.type !== selectedTransactionType || t.category !== "FX")
            return false;
        } else {
          if (t.type !== selectedTransactionType) return false;
          if (selectedTransactionType === "entry" && t.category !== "Deposit")
            return false;
          if (selectedTransactionType === "exit" && t.category !== "Withdrawal")
            return false;
        }
      }

      return true;
    });
  }, [
    allTransactions,
    selectedTransaction,
    fromDate,
    toDate,
    selectedCurrency,
    selectedAccount,
    selectedTransactionType,
  ]);

  const reportClientName = useMemo(() => {
    if (selectedTransaction?.CustomerName)
      return selectedTransaction.CustomerName;
    if (allTransactions?.length) {
      const customer = allTransactions.find((t) => t.CustomerName);
      return customer?.CustomerName || "";
    }
    return "";
  }, [selectedTransaction, allTransactions]);

  // Reset PDF state when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetPdfState();
    }
  }, [isOpen]);

  // Auto-download when PDF URL is ready
  useEffect(() => {
    if (pdfUrl && !isPdfLoading && shouldGeneratePDF && reportClientName && !hasTriggeredDownload.current) {
      hasTriggeredDownload.current = true;
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `Statement_${reportClientName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      // Reset after download
      setTimeout(() => {
        resetPdfState();
      }, 100);
    }
  }, [pdfUrl, isPdfLoading, shouldGeneratePDF, reportClientName]);

  const buyTransactions = clientTransactions.filter((t) => t.type === "buy");
  const sellTransactions = clientTransactions.filter(
    (t) => t.type === "sell_to"
  );

  const transactionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    clientTransactions.forEach((t) => {
      counts[t.type] = (counts[t.type] ?? 0) + 1;
    });
    return counts;
  }, [clientTransactions]);

  const currencyNetTotals = useMemo(() => {
    const depositTotals: Record<string, number> = {};
    const withdrawalTotals: Record<string, number> = {};
    const netTotals: Record<string, number> = {};

    clientTransactions.forEach((t) => {
      let transactionTotal = 0;
      let transactionCurrency = "";

      if (!t.fx_base_currency && !t.fx_quote_currency && t.currency) {
        transactionCurrency = t.currency;
        transactionTotal = (Number(t.amount) || 0) + (Number(t.fee) || 0);
      }

      if (transactionCurrency && transactionTotal !== 0) {
        if (t.type === "entry" && t.category === "Deposit") {
          depositTotals[transactionCurrency] =
            (depositTotals[transactionCurrency] || 0) + transactionTotal;
        } else if (t.type === "exit" && t.category === "Withdrawal") {
          withdrawalTotals[transactionCurrency] =
            (withdrawalTotals[transactionCurrency] || 0) + transactionTotal;
        }
      }
    });

    const allCurrencies = new Set([
      ...Object.keys(depositTotals),
      ...Object.keys(withdrawalTotals),
    ]);

    Array.from(allCurrencies).forEach((currency) => {
      const deposit = depositTotals[currency] || 0;
      const withdrawal = withdrawalTotals[currency] || 0;
      netTotals[currency] = deposit - withdrawal;
    });

    return {
      deposits: depositTotals,
      withdrawals: withdrawalTotals,
      net: netTotals,
    };
  }, [clientTransactions]);

  // حساب إجمالي العملات ومتوسط سعر الصرف لـ "عمليات الشراء" - مصحح
  const buyCurrencyData = useMemo(() => {
    const totals: Record<
      string,
      { total: number; rates: number[]; count: number }
    > = {};
    buyTransactions.forEach((t) => {
      const currency = t.fx_base_currency || t.currency;
      if (currency) {
        // استخدام القيمة (price) بدلاً من fx_base_amount أو amount
        const amount = Number(t.price) || 0;
        if (!totals[currency]) {
          totals[currency] = { total: 0, rates: [], count: 0 };
        }
        totals[currency].total += amount;
        if (t.rate) {
          totals[currency].rates.push(Number(t.rate));
          totals[currency].count += 1;
        }
      }
    });

    // حساب المتوسط لكل عملة
    const result: Record<string, { total: number; averageRate: number }> = {};
    Object.entries(totals).forEach(([currency, data]) => {
      result[currency] = {
        total: data.total,
        averageRate:
          data.rates.length > 0
            ? data.rates.reduce((sum, rate) => sum + rate, 0) /
            data.rates.length
            : 0,
      };
    });

    return result;
  }, [buyTransactions]);

  // حساب إجمالي العملات ومتوسط سعر الصرف لـ "عمليات البيع" - مصحح
  const sellCurrencyData = useMemo(() => {
    const totals: Record<
      string,
      { total: number; rates: number[]; count: number }
    > = {};
    sellTransactions.forEach((t) => {
      const currency = t.fx_base_currency || t.currency;
      if (currency) {
        // استخدام القيمة (price) بدلاً من fx_base_amount أو amount
        const amount = Number(t.price) || 0;
        if (!totals[currency]) {
          totals[currency] = { total: 0, rates: [], count: 0 };
        }
        totals[currency].total += amount;
        if (t.rate) {
          totals[currency].rates.push(Number(t.rate));
          totals[currency].count += 1;
        }
      }
    });

    // حساب المتوسط لكل عملة
    const result: Record<string, { total: number; averageRate: number }> = {};
    Object.entries(totals).forEach(([currency, data]) => {
      result[currency] = {
        total: data.total,
        averageRate:
          data.rates.length > 0
            ? data.rates.reduce((sum, rate) => sum + rate, 0) /
            data.rates.length
            : 0,
      };
    });

    return result;
  }, [sellTransactions]);

  const typeLabelMap: Record<string, string> = {
    entry: "الإيداع / دخول",
    exit: "السحب / خروج",
    buy: "عمليات الشراء",
    sell_to: "عمليات البيع",
  };

  useEffect(() => {
    const fetchCurrencies = async () => {
      const { data, error } = await supabase.from("currencies").select("*");
      if (error) {
        console.error("Error fetching currencies:", error);
      } else {
        setCurrencies(data);
      }
    };

    fetchCurrencies();
  }, []);

  useEffect(() => {
    const fetchAccounts = async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("name")
        .eq("active", true);

      if (error) {
        console.error("Error fetching accounts:", error);
      } else if (data) {
        setAvailableAccounts(data.map((item: { name: string }) => item.name));
      }
    };

    fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchCustomerAccounts = async () => {
      const { data, error } = await supabase
        .from('customers_accounts')
        .select('customer, account');

      if (error) {
        console.error('Error fetching customer accounts:', error);
        return;
      }

      const map: { [customer: string]: string } = {};
      data?.forEach((row: { customer: string; account: string }) => {
        map[row.customer] = row.account;
      });

      setCustomerAccountsMap(map);
    };

    fetchCustomerAccounts();
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    if (!isOpen) {
      setShouldGeneratePDF(false);
      setPdfUrl(null);
      setIsPdfLoading(false);
      hasTriggeredDownload.current = false;
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);
  
  // Reset PDF state when client changes
  useEffect(() => {
    if (selectedTransaction?.CustomerName) {
      setShouldGeneratePDF(false);
      setPdfUrl(null);
      setIsPdfLoading(false);
      hasTriggeredDownload.current = false;
    }
  }, [selectedTransaction?.CustomerName]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Statement_${reportClientName}`,
    pageStyle: `@page { size: A4; margin: 15mm; }`,
  });

  const clearAllFilters = () => {
    setFromDate(null);
    setToDate(null);
    setSelectedCurrency("");
    setSelectedAccount("");
    setSelectedTransactionType("");
  };

  if (!isOpen) return null;

  // Helper function to render table cell content (removes "-")
  const renderTableCell = (value: any) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === "-"
    ) {
      return "";
    }
    return value;
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm font-sans text-[#212E5B]">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col font-sans text-[#212E5B]">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/98 backdrop-blur-sm border-b border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-2 shadow-sm">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <Button
              variant="primary"
              icon={Printer}
              onClick={handlePrint}
              size="sm"
              className="text-xs sm:text-sm"
            >
              طباعة
            </Button>
            {isOpen && selectedTransaction && (
              shouldGeneratePDF ? (
                <>
                  <PDFDownloadLink
                    key={(reportClientName || "") + "-" + (clientTransactions?.length || 0)}
                    document={
                      <PDFReport
                        key={(reportClientName || "") + "-" + (clientTransactions?.length || 0)}
                        data={clientTransactions}
                        clientName={reportClientName}
                        currencyTotals={currencyNetTotals}
                        transactionCounts={transactionCounts}
                        currencies={currencies}
                        buyCurrencyData={buyCurrencyData}
                        sellCurrencyData={sellCurrencyData}
                        selectedTransactionType={selectedTransactionType}
                      />
                    }
                    fileName={`Statement_${reportClientName}.pdf`}
                    style={{ display: "none" }}
                  >
                    {/* @ts-ignore - PDFDownloadLink children function type mismatch */}
                    {({ loading, url }: any) => {
                      // Update state when URL becomes available
                      if (loading !== isPdfLoading) {
                        setIsPdfLoading(loading);
                      }
                      if (url && url !== pdfUrl) {
                        setPdfUrl(url);
                      }
                      return null;
                    }}
                  </PDFDownloadLink>
                  <Button
                    variant="primary"
                    icon={Download}
                    size="sm"
                    className="text-xs sm:text-sm"
                    disabled={isPdfLoading}
                    loading={isPdfLoading}
                  >
                    {isPdfLoading ? "جاري التحميل..." : "تحميل PDF"}
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  icon={Download}
                  size="sm"
                  className="text-xs sm:text-sm"
                  onClick={() => {
                    setShouldGeneratePDF(true);
                    setIsPdfLoading(true);
                  }}
                >
                  تحميل PDF
                </Button>
              )
            )}
          </div>
          <Button
            variant="ghost"
            icon={X}
            onClick={() => {
              resetPdfState();
              onClose();
            }}
            size="sm"
            className="hover:bg-red-50 hover:text-red-600 text-xs sm:text-sm"
          >
            إغلاق
          </Button>
        </div>

        {/* Body */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-2 sm:p-4 bg-gray-50"
        >
          <div className="w-full overflow-x-auto">
            {/* Web Layout - Visible UI */}
            <div className="block print:hidden">
            <div
              className="bg-white shadow-lg w-full p-4 sm:p-6 font-sans text-[#212E5B] min-w-[300px]"
              style={{ fontFamily: "inherit" }}
            >
              {/* Logo + Client */}
              <div className="flex flex-col items-center mb-4">
                <div className="w-24 h-24 sm:w-32 sm:h-32 mb-3">
                  <img
                    src="/applogo.png"
                    alt="App Logo"
                    className="w-full h-full object-contain"
                    crossOrigin="anonymous"
                    style={{
                      maxWidth: "100%",
                      height: "auto",
                      display: "block",
                    }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                </div>
                <h2
                  style={{
                    color: "#212E5B",
                    fontSize: "18px",
                    textAlign: "center",
                  }}
                  className="text-lg sm:text-xl"
                >
                  تقرير العميل:{" "}
                  <span style={{ fontWeight: "bold" }}>{reportClientName}</span>
                </h2>
              </div>

              {/* Filters Section - Not included in PDF */}
              <div ref={filtersRef} className="mb-6 p-3 sm:p-4 bg-gray-100 border border-gray-200 rounded-lg sm:rounded-xl shadow-sm print:hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Filter className="w-4 h-4 text-[#212E5B]" />
                  <h3 className="text-[#212E5B] font-semibold text-sm sm:text-base">
                    تصفية النتائج
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* Date Filters */}
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm text-gray-700 block">
                      من:
                    </label>
                    <DatePicker
                      selected={fromDate}
                      onChange={(date: Date | null) => setFromDate(date)}
                      dateFormat="dd/MM/yyyy"
                      locale="ar"
                      showMonthDropdown={false}
                      showYearDropdown={false}
                      inline={false}
                      placeholderText="يوم/شهر/سنة"
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-xs sm:text-sm"
                      popperClassName="z-[9999]"
                      portalId="root-portal"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm text-gray-700 block">
                      إلى:
                    </label>
                    <DatePicker
                      selected={toDate}
                      onChange={(date: Date | null) => setToDate(date)}
                      dateFormat="dd/MM/yyyy"
                      locale="ar"
                      showMonthDropdown={false}
                      showYearDropdown={false}
                      inline={false}
                      placeholderText="يوم/شهر/سنة"
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-xs sm:text-sm"
                      popperClassName="z-[9999]"
                      portalId="root-portal"
                    />
                  </div>

                  {/* Currency Filter */}
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm text-gray-700 block">
                      العملة:
                    </label>
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-xs sm:text-sm"
                    >
                      <option value="">جميع العملات</option>
                      {currencies.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>


                  {/* Account Filter */}
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm text-gray-700 block">
                      الحساب:
                    </label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-xs sm:text-sm"
                    >
                      <option value="">جميع الحسابات</option>
                      {availableAccounts.map((account) => (
                        <option key={account} value={account}>
                          {account}
                        </option>
                      ))}
                    </select>
                  </div>


                  {/* Transaction Type Filter */}
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm text-gray-700 block">
                      نوع المعاملة:
                    </label>
                    <select
                      value={selectedTransactionType}
                      onChange={(e) =>
                        setSelectedTransactionType(e.target.value)
                      }
                      className="w-full px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-xs sm:text-sm"
                    >
                      {transactionTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                <div className="flex justify-end mt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="bg-white border border-red-500 text-red-500 hover:bg-red-50 px-2 sm:px-3 py-1 rounded-lg text-xs flex items-center gap-1"
                    onClick={clearAllFilters}
                  >
                    <RefreshCcw className="w-3 h-3" />
                    مسح الكل
                  </Button>
                </div>

                {/* Active Filters Display */}
                {(fromDate ||
                  toDate ||
                  selectedCurrency ||
                  selectedAccount ||
                  selectedTransactionType) && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-blue-700 text-xs sm:text-sm font-medium">
                        التصفيات النشطة:
                      </span>
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                        {fromDate && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            من: {format(fromDate, "dd/MM/yyyy")}
                          </span>
                        )}
                        {toDate && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            إلى: {format(toDate, "dd/MM/yyyy")}
                          </span>
                        )}
                        {selectedCurrency && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            العملة: {selectedCurrency}
                          </span>
                        )}
                        {selectedAccount && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">
                            الحساب: {selectedAccount}
                          </span>
                        )}
                        {selectedTransactionType && (
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                            النوع:{" "}
                            {
                              transactionTypeOptions.find(
                                (opt) => opt.value === selectedTransactionType
                              )?.label
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  )}
              </div>

              {/* Transaction Counts */}
              <div className="mb-6 p-3 sm:p-4 bg-gray-100 border border-gray-200 rounded-lg sm:rounded-xl shadow-sm">
                <h3 className="text-[#212E5B] font-semibold mb-2 text-right text-base sm:text-lg">
                  ملخص المعاملات
                </h3>
                <div className="flex flex-wrap justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-[100px] sm:min-w-[120px] bg-white p-2 rounded-lg shadow-sm flex flex-col items-center">
                    <span className="text-gray-500 text-xs sm:text-sm">
                      إجمالي المعاملات
                    </span>
                    <span className="text-[#212E5B] font-bold text-base sm:text-lg">
                      {clientTransactions.length}
                    </span>
                  </div>
                  {Object.entries(transactionCounts).map(([type, count]) => (
                    <div
                      key={type}
                      className="flex-1 min-w-[100px] sm:min-w-[120px] bg-white p-2 rounded-lg shadow-sm flex flex-col items-center"
                    >
                      <span className="text-gray-500 text-xs sm:text-sm">
                        {typeLabelMap[type] ?? type}
                      </span>
                      <span className="text-[#212E5B] font-bold text-base sm:text-lg">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Net Totals per Currency */}
              <div className="mt-6 p-3 sm:p-4 bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm">
                <h3 className="text-[#212E5B] font-semibold mb-4 text-right text-base sm:text-lg">
                  صافي الإيداعات والسحوبات حسب العملة
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">


                  {Object.entries(currencyNetTotals.net)
                    .filter(([currency]) => currencies.some(c => c.name === currency)) // only currencies in table
                    .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
                    .map(([currency, netTotal]) => {
                      const currencyFromTable = currencies.find((c) => c.name === currency)!;
                      const deposit = currencyNetTotals.deposits[currency] || 0;
                      const withdrawal = currencyNetTotals.withdrawals[currency] || 0;
                      const isPositive = netTotal >= 0;

                      return (
                        <div
                          key={currency}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm"
                        >
                          {/* Currency Header */}
                          <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                            <span className="text-base sm:text-lg font-bold text-[#212E5B]">
                              {currencyFromTable.name}
                            </span>
                            {/* <div
                              className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${isPositive ? "bg-[#e6e8ef] text-[#212E5B]" : "bg-red-100 text-red-800"
                                }`}
                            >
                              {isPositive ? "صافي موجب" : "صافي سالب"}
                            </div> */}
                          </div>

                          {/* Deposit Amount */}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600 text-xs sm:text-sm">الإيداع:</span>
                            <span className="text-green-600 font-semibold text-xs sm:text-sm">
                              +{deposit.toLocaleString()}
                            </span>
                          </div>

                          {/* Withdrawal Amount */}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600 text-xs sm:text-sm">السحب:</span>
                            <span className="text-red-600 font-semibold text-xs sm:text-sm">
                              -{withdrawal.toLocaleString()}
                            </span>
                          </div>

                          {/* Net Total */}
                          {/* <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                            <span className="text-gray-700 font-medium text-sm">الصافي:</span>
                            <span
                              className={`text-base sm:text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"
                                }`}
                            >
                              {isPositive ? "+" : ""}
                              {netTotal.toLocaleString()}
                            </span>
                          </div> */}
                        </div>
                      );
                    })}



                </div>
              </div>

              {/* Transaction Tables */}

              <div className="mb-8">
                {/* Entry - Deposits */}
                {(!selectedTransactionType ||
                  selectedTransactionType === "entry") &&
                  (() => {
                    const entryTransactions = clientTransactions.filter(
                      (t) => t.type === "entry" && t.category === "Deposit"
                    );
                    if (entryTransactions.length === 0) return null;
                    return (

                      <div className="mb-6">
                        <h3 className="text-[#212E5B] font-bold mb-3 text-right text-base sm:text-lg">
                          الإيداع / دخول
                        </h3>
                        <div className="overflow-x-auto">
                          <table
                            className="min-w-full border border-gray-300 text-xs sm:text-sm rounded-xl overflow-hidden font-sans text-[#212E5B]"
                            dir="rtl"
                          >
                            <thead className="sticky top-0 z-10 bg-[#212E5B] text-white">
                              <tr>
                                <th className="border p-2 sm:p-3 text-right">
                                  التاريخ
                                </th>
                                <th className="border p-2 sm:p-3 text-right">
                                  الحساب
                                </th>
                                <th className="border p-2 sm:p-3 text-right">
                                  استلمت من
                                </th>

                                <th className="border p-2 sm:p-3 text-right">
                                  البلد / المدينة
                                </th>
                                <th className="border p-2 sm:p-3 text-right">
                                  المبلغ
                                </th>
                                <th className="border p-2 sm:p-3 text-right">
                                  العملة
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {entryTransactions.map((t) => (
                                <tr
                                  key={t.id}
                                  className="hover:bg-gray-100 transition-colors"
                                >
                                  <td className="border p-1 sm:p-2">
                                    {format(
                                      new Date(t.created_at),
                                      "dd/MM/yyyy"
                                    )}
                                  </td>

                                  {/* Account */}

                                  <td className="border p-1 sm:p-2">
                                    {t.customerAccount?.account || "-"}
                                  </td>

                                  <td className="border p-1 sm:p-2">
                                    {renderTableCell(t.deliver_to)}
                                  </td>

                                  <td className="border p-1 sm:p-2">
                                    {renderTableCell(t.country_city)}
                                  </td>
                                  <td className="border p-1 sm:p-2 text-right">
                                    {(
                                      Number(t.amount || 0) + Number(t.fee || 0)
                                    ).toLocaleString()}
                                  </td>

                                  {/* Currency*/}
                                  <td className="border p-1 sm:p-2">
                                    {renderTableCell(t.currency || "-")}
                                  </td>

                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>


                    );
                  })()}

                {/* Exit - Withdrawals */}
                {(!selectedTransactionType ||
                  selectedTransactionType === "exit") &&
                  (() => {
                    const exitTransactions = clientTransactions.filter(
                      (t) => t.type === "exit" && t.category === "Withdrawal"
                    );
                    if (exitTransactions.length === 0) return null;
                    return (
                      <div className="mb-6">
                        <h3 className="text-[#212E5B] font-bold mb-3 text-right text-base sm:text-lg">
                          السحب / خروج
                        </h3>
                        <div className="overflow-x-auto">
                          <table
                            className="min-w-full border border-gray-300 text-xs sm:text-sm rounded-xl overflow-hidden"
                            dir="rtl"
                          >
                            <thead className="sticky top-0 z-10 bg-[#212E5B] text-white">
                              <tr>
                                <th className="border p-2 sm:p-3 text-right">
                                  التاريخ
                                </th>
                                <th className="border p-2 sm:p-3 text-right">
                                  الحساب
                                </th>
                                <th className="border p-2 sm:p-3 text-right">
                                  تسليم إلى
                                </th>
                                <th className="border p-2 sm:p-3 text-right">
                                  البلد / المدينة
                                </th>
                                <th className="border p-2 sm:p-3 text-right">
                                  المبلغ
                                </th>
                                <th className="border p-2 sm:p-3 text-right">
                                  العملة
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {exitTransactions.map((t) => (
                                <tr
                                  key={t.id}
                                  className="hover:bg-gray-100 transition-colors"
                                >
                                  <td className="border p-1 sm:p-2">
                                    {format(
                                      new Date(t.created_at),
                                      "dd/MM/yyyy"
                                    )}
                                  </td>
                                  {/* Account */}

                                  <td className="border p-1 sm:p-2">
                                    {t.customerAccount?.account || "-"}
                                  </td>


                                  <td className="border p-1 sm:p-2">
                                    {renderTableCell(t.deliver_to)}
                                  </td>
                                  {/* city */}
                                  <td className="border p-1 sm:p-2">
                                    {renderTableCell(t.country_city)}
                                  </td>
                                  <td className="border p-1 sm:p-2 text-right">
                                    {(
                                      Number(t.amount || 0) + Number(t.fee || 0)
                                    ).toLocaleString()}
                                  </td>
                                  {/* Currency*/}
                                  <td className="border p-1 sm:p-2">
                                    {renderTableCell(t.currency || "-")}
                                  </td>

                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                {/* Buy From Table */}
                {(() => {
                  const buyTransactions = clientTransactions.filter(
                    (t) => t.type === "buy"
                  );
                  if (buyTransactions.length === 0) return null;

                  return (
                    <div className="mb-6">
                      {/* Buy Transactions Currency Totals */}
                      {Object.keys(buyCurrencyData).length > 0 && (
                        <div className="mb-4 p-4 bg-white border border-green-200 rounded-lg shadow-sm">
                          <h3 className="text-[#212E5B] font-bold mb-4 text-right text-lg">
                            إجمالي عمليات الشراء حسب العملة
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(buyCurrencyData)
                              .sort(([currencyA], [currencyB]) =>
                                currencyA.localeCompare(currencyB)
                              )
                              .map(([currency, data]) => (
                                <div
                                  key={currency}
                                  className="bg-green-50 border border-green-200 rounded-lg p-4 shadow-sm"
                                >
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-lg font-bold text-[#212E5B]">
                                      {currency}
                                    </span>
                                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                      إجمالي الشراء
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-700 font-medium text-sm">
                                        المبلغ الإجمالي:
                                      </span>
                                      <span className="text-green-600 font-bold">
                                        {data.total.toLocaleString()} {currency}
                                      </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-700 font-medium text-sm">
                                        متوسط سعر الصرف:
                                      </span>
                                      <span className="text-blue-600 font-bold">
                                        {data.averageRate.toFixed(4)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      <h3 className="text-[#212E5B] font-bold mb-3 text-right text-base sm:text-lg">
                        عمليات الشراء
                      </h3>
                      <div className="overflow-x-auto">
                        <table
                          className="min-w-full border border-gray-300 text-xs sm:text-sm rounded-xl overflow-hidden"
                          dir="rtl"
                        >
                          <thead className="sticky top-0 z-10 bg-[#212E5B] text-white">
                            <tr>
                              <th className="border p-2 sm:p-3 text-right">
                                التاريخ
                              </th>

                              <th className="border p-2 sm:p-3 text-right">
                                الحساب
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                البلد / المدينة
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                القيمة
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                عملة الأساس
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                سعر الصرف
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                مبلغ
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                العملة
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {buyTransactions.map((t) => (
                              <tr
                                key={t.id}
                                className="hover:bg-gray-100 transition-colors"
                              >
                                <td className="border p-1 sm:p-2">
                                  {t.created_at
                                    ? format(
                                      new Date(t.created_at),
                                      "dd/MM/yyyy"
                                    )
                                    : ""}
                                </td>

                                {/* Account */}

                                <td className="border p-1 sm:p-2">
                                  {t.customerAccount?.account || "-"}
                                </td>

                                <td className="border p-1 sm:p-2">
                                  {renderTableCell(t.country_city)}
                                </td>
                                <td className="border p-1 sm:p-2 text-right">
                                  {t.price !== undefined
                                    ? Number(t.price).toLocaleString()
                                    : ""}
                                </td>
                                {/* Currency*/}
                                <td className="border p-1 sm:p-2">
                                  {renderTableCell(t.currency || "-")}
                                </td>

                                <td className="border p-1 sm:p-2">
                                  {renderTableCell(t.rate)}
                                </td>
                                <td className="border p-1 sm:p-2 text-right">
                                  {t.price !== undefined && t.rate !== undefined
                                    ? (
                                      Number(t.price) * Number(t.rate)
                                    ).toLocaleString()
                                    : ""}
                                </td>
                                <td className="border p-1 sm:p-2">
                                  {t.currency_final ?? "دينار ليبي"}
                                </td>


                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>




                    </div>
                  );
                })()}

                {/* Sell To Table */}
                {(() => {
                  const sellToTransactions = clientTransactions.filter(
                    (t) => t.type === "sell_to"
                  );
                  if (sellToTransactions.length === 0) return null;

                  return (
                    <div className="mb-6">
                      {/* Sell Transactions Currency Totals */}
                      {Object.keys(sellCurrencyData).length > 0 && (
                        <div className="mb-4 p-4 bg-white border border-blue-200 rounded-lg shadow-sm">
                          <h3 className="text-[#212E5B] font-bold mb-4 text-right text-lg">
                            إجمالي عمليات البيع حسب العملة
                          </h3>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(sellCurrencyData)
                              .sort(([currencyA], [currencyB]) =>
                                currencyA.localeCompare(currencyB)
                              )
                              .map(([currency, data]) => (
                                <div
                                  key={currency}
                                  className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm"
                                >
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="text-lg font-bold text-[#212E5B]">
                                      {currency}
                                    </span>
                                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                      إجمالي البيع
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-700 font-medium text-sm">
                                        المبلغ الإجمالي:
                                      </span>
                                      <span className="text-blue-600 font-bold">
                                        {data.total.toLocaleString()} {currency}
                                      </span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-700 font-medium text-sm">
                                        متوسط سعر الصرف:
                                      </span>
                                      <span className="text-purple-600 font-bold">
                                        {data.averageRate.toFixed(4)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      <h3 className="text-[#212E5B] font-bold mb-3 text-right text-base sm:text-lg">
                        عمليات البيع
                      </h3>
                      <div className="overflow-x-auto">
                        <table
                          className="min-w-full border border-gray-300 text-xs sm:text-sm rounded-xl overflow-hidden"
                          dir="rtl"
                        >
                          <thead className="sticky top-0 z-10 bg-[#212E5B] text-white">
                            <tr>
                              <th className="border p-2 sm:p-3 text-right">
                                التاريخ
                              </th>

                              <th className="border p-2 sm:p-3 text-right">
                                الحساب
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                البلد / المدينة
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                القيمة
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                عملة الأساس
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                سعر الصرف
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                مبلغ
                              </th>
                              <th className="border p-2 sm:p-3 text-right">
                                العملة
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sellToTransactions.map((t) => (
                              <tr
                                key={t.id}
                                className="hover:bg-gray-100 transition-colors"
                              >
                                <td className="border p-1 sm:p-2">
                                  {t.created_at
                                    ? format(
                                      new Date(t.created_at),
                                      "dd/MM/yyyy"
                                    )
                                    : ""}
                                </td>


                                {/* Account */}

                                <td className="border p-1 sm:p-2">
                                  {t.customerAccount?.account || "-"}
                                </td>


                                <td className="border p-1 sm:p-2">
                                  {renderTableCell(t.country_city)}
                                </td>
                                <td className="border p-1 sm:p-2 text-right">
                                  {t.price !== undefined
                                    ? Number(t.price).toLocaleString()
                                    : ""}
                                </td>
                                {/* Currency*/}
                                <td className="border p-1 sm:p-2">
                                  {renderTableCell(t.currency || "-")}
                                </td>

                                <td className="border p-1 sm:p-2">
                                  {renderTableCell(t.rate)}
                                </td>
                                <td className="border p-1 sm:p-2 text-right">
                                  {t.price !== undefined && t.rate !== undefined
                                    ? (
                                      Number(t.price) * Number(t.rate)
                                    ).toLocaleString()
                                    : ""}
                                </td>
                                <td className="border p-1 sm:p-2">
                                  {t.currency_final  ?? "دينار ليبي"}
                                </td>

                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            </div>
            {/* End of Web Layout */}

            {/* Printable Component - Hidden on screen, used for ReactToPrint */}
            <div className="hidden">
              <PrintableReport
                ref={printRef}
                data={clientTransactions}
                clientName={reportClientName}
                currencyTotals={currencyNetTotals}
                transactionCounts={transactionCounts}
                currencies={currencies}
                buyCurrencyData={buyCurrencyData}
                sellCurrencyData={sellCurrencyData}
                selectedTransactionType={selectedTransactionType}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
