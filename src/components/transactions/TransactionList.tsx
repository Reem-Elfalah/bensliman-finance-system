// src/transactions/TransactionList.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  FileText,
  Trash2,
} from "lucide-react";
import { Button } from "../ui/Button";
import { InvoiceGenerator } from "../invoice/InvoiceGenerator";
import { ReportGenerator, Transaction } from "../Reports/reports";
import { supabase } from "../../lib/supabase";
import Portal from "../Portal";

interface TransactionListProps {
  transactions: Transaction[];
  loading: boolean;
}

const typeConfig = {
  exit: {
    label: "خروج",
    icon: TrendingDown,
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  sell_to: {
    label: "بيع الى",
    icon: DollarSign,
    color: "text-green-500",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  buy: {
    label: "شراء من",
    icon: TrendingUp,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  entry: {
    label: "دخول",
    icon: Activity,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
};

export function TransactionList({
  transactions,
  loading,
}: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [selectedReportTransaction, setSelectedReportTransaction] =
    useState<Transaction | null>(null);
  const [showReport, setShowReport] = useState(false);

  const [localTransactions, setLocalTransactions] =
    useState<Transaction[]>(transactions);

  useEffect(() => {
    setLocalTransactions(transactions);
  }, [transactions]);

  const handleGenerateInvoice = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowInvoice(true);
  };

  const handleCloseInvoice = () => {
    setShowInvoice(false);
    setSelectedTransaction(null);
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setSelectedReportTransaction(null);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه المعاملة؟")) return;

    setLocalTransactions((prev) => prev.filter((t) => t.id !== transactionId));

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId);

    if (error) {
      console.error("خطأ أثناء حذف المعاملة:", error);
      alert("فشل الحذف، حاول مرة أخرى.");
      setLocalTransactions(transactions);
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="animate-pulse"
          >
            <div className="bg-gray-200 rounded-xl h-20 md:h-24 lg:h-28"></div>
          </motion.div>
        ))}
      </div>
    );
  }

  if (localTransactions.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12 md:py-16 lg:py-20"
      >
        <div className="w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28 bg-gray-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
          <DollarSign className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 text-gray-400" />
        </div>
        <h3 className="text-xl md:text-2xl lg:text-3xl font-medium text-gray-900 mb-3">
          لا توجد معاملات
        </h3>
        <p className="text-gray-500 text-lg md:text-xl">
          ابدأ بإضافة معاملة جديدة
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="space-y-4 md:space-y-6 lg:space-y-8">
        <AnimatePresence initial={false}>
          {localTransactions.map((transaction) => {
            const config = typeConfig[transaction.type];
            const Icon = config.icon;

            return (
              <motion.div
                key={transaction.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className={`p-4 md:p-6 lg:p-8 rounded-xl border-2 ${config.borderColor} ${config.bgColor} hover:shadow-lg transition-all duration-200`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 md:gap-6">
                  {/* Main Content */}
                  <div className="flex-1">
                    {/* Header Section */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div
                          className={`p-3 md:p-4 rounded-xl ${config.bgColor} border ${config.borderColor} flex-shrink-0`}
                        >
                          <Icon
                            className={`w-6 h-6 md:w-8 md:h-8 ${config.color}`}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-xl md:text-2xl lg:text-3xl">
                            {config.label}
                          </h3>
                          <span className="text-gray-500 text-sm md:text-base lg:text-lg">
                            {transaction.created_at
                              ? format(
                                new Date(transaction.created_at),
                                "PPp",
                                { locale: ar }
                              )
                              : "-"}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 md:gap-3 justify-start sm:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={FileText}
                          onClick={() => handleGenerateInvoice(transaction)}
                          className="text-sm md:text-base px-4 md:px-6 py-2 md:py-3"
                        >
                          إنشاء إيصال
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Trash2}
                          onClick={() =>
                            handleDeleteTransaction(transaction.id)
                          }
                          className="text-sm md:text-base border-red-500 text-red-600 hover:bg-red-100 px-4 md:px-6 py-2 md:py-3"
                        >
                          حذف
                        </Button>
                      </div>
                    </div>

                    {/* Transaction Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">

                      {/* Customer Name for exit / Entry */}
                      {transaction.type === "exit" || transaction.type === "entry" ? (
                        <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                          <span className="text-gray-500 block mb-2 text-sm md:text-base">
                            العميل:
                          </span>
                          <p className="font-semibold text-lg md:text-xl text-gray-900">
                            {transaction.CustomerName || "-"}
                          </p>
                        </div>
                      ) : null}


                      {/* From Account */}
                      {transaction.from_account_name && (
                        <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                          <span className="text-gray-500 block mb-2 text-sm md:text-base">
                            من حساب:
                          </span>
                          <p className="font-semibold text-lg md:text-xl text-gray-900">
                            {transaction.from_account_name}
                          </p>
                        </div>
                      )}

                      {/* To Account */}
                      {/* {transaction.to_account_name && (
                        <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                          <span className="text-gray-500 block mb-2 text-sm md:text-base">
                            العميل:
                          </span>
                          <p className="font-semibold text-lg md:text-xl text-gray-900">
                            {transaction.to_account_name}
                          </p>
                        </div>
                      )} */}

                      {/* Deliver To */}
                      {transaction.deliver_to && (
                        <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                          <span className="text-gray-500 block mb-2 text-sm md:text-base">
                            {transaction.type === "entry"
                              ? "استلام من:"
                              : "تسليم إلى:"}
                          </span>
                          <p className="font-semibold text-lg md:text-xl text-gray-900">
                            {transaction.deliver_to}
                          </p>
                        </div>
                      )}

                      {/* Conditional Amount Rendering for Buy/Sell */}
                      {transaction.type === "sell_to" ||
                        transaction.type === "buy" ? (
                        <>

                          {/* Customer Name */}
                          <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                            <span className="text-gray-500 block mb-2 text-sm md:text-base">
                              الحساب:
                            </span>
                            <p className="font-semibold text-lg md:text-xl text-gray-900">
                              {transaction.CustomerName || "-"}
                            </p>
                          </div>
                          {/* Base Amount */}
                          <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                            <span className="text-gray-500 block mb-2 text-sm md:text-base">
                              المبلغ الأساسي:
                            </span>
                            <p className="font-bold text-xl md:text-2xl text-gray-900">
                              {(transaction.price ?? 0).toLocaleString()}{" "}
                              <span className="text-lg md:text-xl">
                                {transaction.currency || "LYD"}
                              </span>
                            </p>
                          </div>

                          {/* Final Amount */}
                          <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                            <span className="text-gray-500 block mb-2 text-sm md:text-base">
                              المبلغ النهائي:
                            </span>
                            <p className="font-bold text-xl md:text-2xl text-gray-900">
                              {/* {transaction.price}{" "} */}
                              {(transaction.fx_final_amount ?? 0).toLocaleString()}{" "}
                              {transaction.currency_final }
                            </p>

                          </div>

                          {/* Exchange Rate */}
                          <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                            <span className="text-gray-500 block mb-2 text-sm md:text-base">
                              سعر الصرف:
                            </span>
                            <p className="font-bold text-xl md:text-2xl text-gray-900">
                              {transaction.rate ?? 0}
                            </p>
                          </div>
                        </>
                      ) : (
                        /* Regular Amount for other types */
                        <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                          <span className="text-gray-500 block mb-2 text-sm md:text-base">
                            المبلغ:
                          </span>
                          <p className="font-bold text-xl md:text-2xl text-gray-900">
                            {(transaction.amount ?? 0).toLocaleString()}{" "}
                            <span className="text-lg md:text-xl">
                              {transaction.currency || "LYD"}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Country/City */}
                      <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                        <span className="text-gray-500 block mb-2 text-sm md:text-base">
                          البلد/المدينة:
                        </span>
                        <p className="font-semibold text-lg md:text-xl text-gray-900">
                          {transaction.country_city || "-"}
                        </p>
                      </div>

                      {/* Paper Category */}
                      <div className="bg-white/70 p-4 md:p-5 rounded-xl border border-gray-200">
                        <span className="text-gray-500 block mb-2 text-sm md:text-base">
                          الفئة الورقية:
                        </span>
                        <p className="font-semibold text-lg md:text-xl text-gray-900">
                          {transaction.paper_category || "-"}
                        </p>
                      </div>
                    </div>



                    {/* Notes Section */}
                    {transaction.notes && (
                      <div className="mt-4 md:mt-6 p-4 md:p-6 bg-white/70 rounded-xl border border-gray-200">
                        <span className="text-gray-500 text-base md:text-lg block mb-3">
                          ملاحظة:
                        </span>
                        <p className="text-gray-700 leading-relaxed text-base md:text-lg">
                          {transaction.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {selectedTransaction && showInvoice && (
        <Portal>
          <InvoiceGenerator
            transaction={selectedTransaction}
            isOpen={showInvoice}
            onClose={handleCloseInvoice}
          />
        </Portal>
      )}

      {selectedReportTransaction && showReport && (
        <ReportGenerator
          selectedTransaction={selectedReportTransaction}
          allTransactions={transactions}
          isOpen={showReport}
          onClose={handleCloseReport}
        />
      )}
    </>
  );
}
