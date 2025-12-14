import { forwardRef } from "react";
import { format } from "date-fns";
import { Transaction } from "./reports";

type TransactionWithTreasury = Transaction & {
  Treasury?: string;
  account?: string;
  customerAccount?: { name: string; account: string; currency: string };
};

interface PrintableCompanyReportProps {
  data: TransactionWithTreasury[];
  currencyTotals: {
    deposits: Record<string, number>;
    withdrawals: Record<string, number>;
    net: Record<string, number>;
  };
  transactionCounts: Record<string, number>;
  dateRange: {
    fromDate: Date | null;
    toDate: Date | null;
  };
  currencies: Array<{ id: number; code: string; symbol: string; name: string }>;
  buyCurrencyData: Record<string, { total: number; averageRate: number }>;
  sellCurrencyData: Record<string, { total: number; averageRate: number }>;
  selectedTransactionType?: string;
}

const typeLabelMap: Record<string, string> = {
  entry: "الإيداع / دخول",
  exit: "السحب / خروج",
  buy: "عمليات الشراء",
  sell_to: "عمليات البيع",
};

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

export const PrintableCompanyReport = forwardRef<
  HTMLDivElement,
  PrintableCompanyReportProps
>(
  (
    {
      data,
      currencyTotals,
      transactionCounts,
      dateRange,
      currencies,
      buyCurrencyData,
      sellCurrencyData,
      selectedTransactionType,
    },
    ref
  ) => {
    return (
      <>
        <style>
          {`
            @font-face {
              font-family: 'ArabicFont';
              src: url('/fonts/Cairo-Regular.ttf') format('truetype');
              font-weight: normal;
            }

            @font-face {
              font-family: 'ArabicFont';
              src: url('/fonts/Cairo-Bold.ttf') format('truetype');
              font-weight: bold;
            }

            #print-container,
            #print-container * {
              font-family: 'ArabicFont' !important;
              direction: rtl !important;
              unicode-bidi: isolate !important;
            }

            table, th, td {
              font-family: 'ArabicFont' !important;
            }

            @media print {
              @page {
                size: A4;
                margin: 15mm;
              }
              * {
                font-family: 'ArabicFont' !important;
                direction: rtl !important;
                unicode-bidi: isolate !important;
              }
              body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                width: 100%;
                overflow: visible;
              }
              #print-container {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
                padding: 0;
                background: white;
                direction: rtl !important;
                unicode-bidi: isolate !important;
                box-sizing: border-box;
              }
              .page-break {
                page-break-before: always;
                break-before: page;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                direction: rtl !important;
                unicode-bidi: isolate !important;
                table-layout: auto;
                font-size: 10px;
              }
              td, th {
                direction: rtl !important;
                unicode-bidi: isolate !important;
                border: 1px solid #ccc;
                padding: 6px;
                word-wrap: break-word;
                overflow-wrap: break-word;
              }
            }
          `}
        </style>
        <div id="print-container" ref={ref} style={{ fontFamily: "ArabicFont", color: "#212E5B", width: "100%", maxWidth: "794px", margin: "0 auto", padding: "20px", direction: "rtl" }}>
          {/* Logo + Title */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ width: "120px", height: "120px", margin: "0 auto 15px" }}>
              <img
                src="/applogo.png"
                alt="App Logo"
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
            <h2 style={{ color: "#212E5B", fontSize: "18px", textAlign: "center", margin: 0 }}>
              تقرير الشركة - جميع المعاملات
            </h2>
            {(dateRange.fromDate || dateRange.toDate) && (
              <p style={{ marginTop: "8px", fontSize: "14px", color: "#666" }}>
                {dateRange.fromDate && format(dateRange.fromDate, "dd/MM/yyyy")}
                {" - "}
                {dateRange.toDate && format(dateRange.toDate, "dd/MM/yyyy")}
              </p>
            )}
          </div>

          {/* Transaction Counts */}
          <div style={{ marginBottom: "20px", padding: "15px", background: "#f3f4f6", border: "1px solid #e5e7eb" }}>
            <h3 style={{ color: "#212E5B", fontWeight: "600", marginBottom: "10px", textAlign: "right", fontSize: "16px" }}>
              ملخص المعاملات
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "15px" }}>
              <div style={{ flex: "1", minWidth: "120px", background: "white", padding: "10px", textAlign: "center" }}>
                <span style={{ color: "#6b7280", fontSize: "12px", display: "block" }}>
                  إجمالي المعاملات
                </span>
                <span style={{ color: "#212E5B", fontWeight: "bold", fontSize: "16px", display: "block" }}>
                  {data.length}
                </span>
              </div>
              {Object.entries(transactionCounts).map(([type, count]) => (
                <div
                  key={type}
                  style={{ flex: "1", minWidth: "120px", background: "white", padding: "10px", textAlign: "center" }}
                >
                  <span style={{ color: "#6b7280", fontSize: "12px", display: "block" }}>
                    {typeLabelMap[type] ?? type}
                  </span>
                  <span style={{ color: "#212E5B", fontWeight: "bold", fontSize: "16px", display: "block" }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Net Totals per Currency */}
          <div style={{ marginBottom: "20px", padding: "15px", background: "white", border: "1px solid #e5e7eb" }}>
            <h3 style={{ color: "#212E5B", fontWeight: "600", marginBottom: "15px", textAlign: "right", fontSize: "16px" }}>
              صافي الإيداعات والسحوبات حسب العملة
            </h3>
            <div style={{ display: "block" }}>
              {currencies.map((c) => {
                const currency = c.name;
                const netTotal = currencyTotals.net[currency] || 0;
                const deposit = currencyTotals.deposits[currency] || 0;
                const withdrawal = currencyTotals.withdrawals[currency] || 0;
                const isPositive = netTotal >= 0;

                return (
                  <div
                    key={currency}
                    style={{ marginBottom: "15px", padding: "15px", background: "#f9fafb", border: "1px solid #e5e7eb" }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #e5e7eb" }}>
                      <span style={{ fontSize: "16px", fontWeight: "bold", color: "#212E5B" }}>
                        {currency}
                      </span>
                      {/* <div
                        style={{
                          padding: "5px 12px",
                          borderRadius: "9999px",
                          fontSize: "12px",
                          fontWeight: "500",
                          background: isPositive ? "#e6e8ef" : "#fee2e2",
                          color: isPositive ? "#212E5B" : "#991b1b",
                        }}
                      >
                        {isPositive ? "صافي موجب" : "صافي سالب"}
                      </div> */}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>الإيداع:</span>
                      <span style={{ color: "#16a34a", fontWeight: "600", fontSize: "12px" }}>
                        +{deposit.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#6b7280", fontSize: "12px" }}>السحب:</span>
                      <span style={{ color: "#dc2626", fontWeight: "600", fontSize: "12px" }}>
                        -{withdrawal.toLocaleString()}
                      </span>
                    </div>
                    {/* <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #e5e7eb" }}>
                      <span style={{ color: "#374151", fontWeight: "500", fontSize: "14px" }}>الصافي:</span>
                      <span
                        style={{
                          fontSize: "16px",
                          fontWeight: "bold",
                          color: isPositive ? "#16a34a" : "#dc2626",
                        }}
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
          <div style={{ marginBottom: "20px" }}>
            {/* Entry - Deposits */}
            {(!selectedTransactionType || selectedTransactionType === "entry") &&
              (() => {
                const entryTransactions = data.filter(
                  (t) =>
                    t.type === "entry" &&
                    (!t.category || t.category === "Deposit")
                );
                if (entryTransactions.length === 0) return null;
                return (
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ color: "#212E5B", fontWeight: "bold", marginBottom: "10px", textAlign: "right", fontSize: "16px" }}>
                      الإيداع / دخول
                    </h3>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        border: "1px solid #d1d5db",
                        fontSize: "12px",
                        fontFamily: "ArabicFont",
                      }}
                      dir="rtl"
                    >
                      <thead>
                        <tr style={{ background: "#212E5B", color: "white" }}>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>التاريخ</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>العميل</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>الحساب</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>استلمت من</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>البلد / المدينة</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>المبلغ</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>العملة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entryTransactions.map((t) => (
                          <tr key={t.id}>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {format(new Date(t.created_at), "dd/MM/yyyy")}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {t.CustomerName ? t.CustomerName.split(" - ")[0] : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {t.customerAccount?.account || "-"}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {renderTableCell(t.deliver_to)}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {renderTableCell(t.country_city)}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right" }}>
                              {(Number(t.amount || 0) + Number(t.fee || 0)).toLocaleString()}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {renderTableCell(t.currency || "-")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            {/* Exit - Withdrawals */}
            {(!selectedTransactionType || selectedTransactionType === "exit") &&
              (() => {
                const exitTransactions = data.filter(
                  (t) =>
                    t.type === "exit" &&
                    (!t.category || t.category === "Withdrawal")
                );
                if (exitTransactions.length === 0) return null;
                return (
                  <div style={{ marginBottom: "20px" }}>
                    <h3 style={{ color: "#212E5B", fontWeight: "bold", marginBottom: "10px", textAlign: "right", fontSize: "16px" }}>
                      السحب / خروج
                    </h3>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        border: "1px solid #d1d5db",
                        fontSize: "12px",
                        fontFamily: "ArabicFont",
                      }}
                      dir="rtl"
                    >
                      <thead>
                        <tr style={{ background: "#212E5B", color: "white" }}>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>التاريخ</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>العميل</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>الحساب</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>تسليم إلى</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>البلد / المدينة</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>المبلغ</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>العملة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exitTransactions.map((t) => (
                          <tr key={t.id}>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {format(new Date(t.created_at), "dd/MM/yyyy")}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {t.CustomerName ? t.CustomerName.split(" - ")[0] : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {t.customerAccount?.account || "-"}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {renderTableCell(t.deliver_to)}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {renderTableCell(t.country_city)}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right" }}>
                              {(Number(t.amount || 0) + Number(t.fee || 0)).toLocaleString()}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {renderTableCell(t.currency || "-")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            {/* Buy From Table */}
            {(!selectedTransactionType || selectedTransactionType === "buy") &&
              (() => {
                const buyFromTransactions = data.filter(
                  (t) => t.type === "buy"
                );
                if (buyFromTransactions.length === 0) return null;

                return (
                  <div style={{ marginBottom: "20px" }}>
                    {/* Buy Transactions Currency Totals */}
                    {Object.keys(buyCurrencyData).length > 0 && (
                      <div style={{ marginBottom: "15px", padding: "15px", background: "white", border: "1px solid #bbf7d0" }}>
                        <h3 style={{ color: "#212E5B", fontWeight: "bold", marginBottom: "15px", textAlign: "right", fontSize: "16px" }}>
                          إجمالي عمليات الشراء حسب العملة
                        </h3>
                        <div style={{ display: "block" }}>
                          {Object.entries(buyCurrencyData)
                            .filter(([currency]) => currencies.some(c => c.name === currency))
                            .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
                            .map(([currency, data]) => (
                              <div
                                key={currency}
                                style={{ marginBottom: "15px", padding: "15px", background: "#f0fdf4", border: "1px solid #bbf7d0" }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                  <div style={{ padding: "5px 12px", background: "#dcfce7", color: "#166534", borderRadius: "9999px", fontSize: "12px", fontWeight: "500" }}>
                                    {currency}
                                  </div>
                                </div>
                                <div style={{ display: "block" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                    <span style={{ color: "#374151", fontSize: "12px" }}>متوسط سعر الصرف:</span>
                                    <span style={{ color: "#16a34a", fontWeight: "bold", fontSize: "12px" }}>
                                      {data.averageRate.toFixed(4)}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#374151", fontSize: "12px" }}>إجمالي المبلغ:</span>
                                    <span style={{ color: "#16a34a", fontWeight: "bold", fontSize: "12px" }}>
                                      {data.total.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <h3 style={{ color: "#212E5B", fontWeight: "bold", marginBottom: "10px", textAlign: "right", fontSize: "16px" }}>
                      عمليات الشراء
                    </h3>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        border: "1px solid #d1d5db",
                        fontSize: "12px",
                        fontFamily: "ArabicFont",
                      }}
                      dir="rtl"
                    >
                      <thead>
                        <tr style={{ background: "#212E5B", color: "white" }}>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>التاريخ</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>العميل</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>الحساب</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>البلد / المدينة</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>المبلغ الأساسي</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>سعر الصرف</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>المبلغ النهائي</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>العملة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {buyFromTransactions.map((t) => (
                          <tr key={t.id}>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {format(new Date(t.created_at), "dd/MM/yyyy")}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {t.CustomerName ? t.CustomerName.split(" - ")[0] : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {t.customerAccount?.account || "-"}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {renderTableCell(t.country_city)}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right" }}>
                              {t.price !== undefined ? Number(t.price).toLocaleString() : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right" }}>
                              {t.rate !== undefined ? Number(t.rate).toLocaleString() : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right" }}>
                              {t.price !== undefined && t.rate !== undefined
                                ? (Number(t.price) * Number(t.rate)).toLocaleString()
                                : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {renderTableCell(t.currency || "-")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

            {/* Sell To Table */}
            {(!selectedTransactionType || selectedTransactionType === "sell_to") &&
              (() => {
                const sellToTransactions = data.filter(
                  (t) => t.type === "sell_to"
                );
                if (sellToTransactions.length === 0) return null;

                return (
                  <div style={{ marginBottom: "20px" }}>
                    {/* Sell Transactions Currency Totals */}
                    {Object.keys(sellCurrencyData).length > 0 && (
                      <div style={{ marginBottom: "15px", padding: "15px", background: "white", border: "1px solid #bfdbfe" }}>
                        <h3 style={{ color: "#212E5B", fontWeight: "bold", marginBottom: "15px", textAlign: "right", fontSize: "16px" }}>
                          إجمالي عمليات البيع حسب العملة
                        </h3>
                        <div style={{ display: "block" }}>
                          {Object.entries(sellCurrencyData)
                            .filter(([currency]) => currencies.some(c => c.name === currency))
                            .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
                            .map(([currency, data]) => (
                              <div
                                key={currency}
                                style={{ marginBottom: "15px", padding: "15px", background: "#eff6ff", border: "1px solid #bfdbfe" }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                  <div style={{ padding: "5px 12px", background: "#dbeafe", color: "#1e40af", borderRadius: "9999px", fontSize: "12px", fontWeight: "500" }}>
                                    {currency}
                                  </div>
                                </div>
                                <div style={{ display: "block" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                                    <span style={{ color: "#374151", fontSize: "12px" }}>متوسط سعر الصرف:</span>
                                    <span style={{ color: "#2563eb", fontWeight: "bold", fontSize: "12px" }}>
                                      {data.averageRate.toFixed(4)}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ color: "#374151", fontSize: "12px" }}>إجمالي المبلغ:</span>
                                    <span style={{ color: "#2563eb", fontWeight: "bold", fontSize: "12px" }}>
                                      {data.total.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <h3 style={{ color: "#212E5B", fontWeight: "bold", marginBottom: "10px", textAlign: "right", fontSize: "16px" }}>
                      عمليات البيع
                    </h3>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        border: "1px solid #d1d5db",
                        fontSize: "12px",
                        fontFamily: "ArabicFont",
                      }}
                      dir="rtl"
                    >
                      <thead>
                        <tr style={{ background: "#212E5B", color: "white" }}>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>التاريخ</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>العميل</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>الحساب</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>البلد / المدينة</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>المبلغ الأساسي</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>سعر الصرف</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>المبلغ النهائي</th>
                          <th style={{ border: "1px solid #d1d5db", padding: "8px", textAlign: "right" }}>العملة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sellToTransactions.map((t) => (
                          <tr key={t.id}>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {format(new Date(t.created_at), "dd/MM/yyyy")}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {t.CustomerName ? t.CustomerName.split(" - ")[0] : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {t.customerAccount?.account || "-"}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {renderTableCell(t.country_city)}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right" }}>
                              {t.price !== undefined ? Number(t.price).toLocaleString() : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right" }}>
                              {t.rate !== undefined ? Number(t.rate).toLocaleString() : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px", textAlign: "right" }}>
                              {t.price !== undefined && t.rate !== undefined
                                ? (Number(t.price) * Number(t.rate)).toLocaleString()
                                : ""}
                            </td>
                            <td style={{ border: "1px solid #d1d5db", padding: "6px" }}>
                              {t.currency_final ?? "دينار ليبي"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
          </div>
        </div>
      </>
    );
  }
);

PrintableCompanyReport.displayName = "PrintableCompanyReport";

