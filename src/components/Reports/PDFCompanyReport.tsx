import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { Transaction } from "./reports";

// Register Arabic font for PDF rendering
Font.register({
  family: "ArabicPDF",
  fonts: [
    {
      src: "/fonts/Cairo-Regular.ttf",
      fontWeight: "normal",
    },
    {
      src: "/fonts/Cairo-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});


type TransactionWithTreasury = Transaction & {
  Treasury?: string;
  account?: string;
  customerAccount?: { name: string; account: string; currency: string };
};

interface PDFCompanyReportProps {
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

const styles = StyleSheet.create({
  page: {
    padding: 20,
    paddingBottom: 50,
    fontFamily: "ArabicPDF",
    fontSize: 10,
    color: "#212E5B",
    direction: "rtl",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: "#666",
    fontFamily: "ArabicPDF",
    direction: "rtl",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
    direction: "rtl",
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
    alignSelf: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 5,
    color: "#212E5B",
    fontFamily: "ArabicPDF",
    textAlign: "center",
    direction: "rtl",
  },
  dateRange: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
    fontFamily: "ArabicPDF",
    textAlign: "center",
    direction: "rtl",
  },
  section: {
    marginBottom: 15,
    direction: "rtl",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
    color: "#212E5B",
    borderBottom: "1px solid #ddd",
    paddingBottom: 5,
    fontFamily: "ArabicPDF",
    textAlign: "right",
    direction: "rtl",
    letterSpacing: 0,
    wordSpacing: 0,
  },
  summaryBox: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    marginBottom: 10,
    borderRadius: 4,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#666",
    fontFamily: "ArabicPDF",
    textAlign: "right",
    direction: "rtl",
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 700,
    color: "#212E5B",
    fontFamily: "ArabicPDF",
    textAlign: "right",
    direction: "rtl",
  },
  currencyBox: {
    backgroundColor: "#f9fafb",
    padding: 10,
    marginBottom: 10,
    border: "1px solid #e5e7eb",
  },
  currencyHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 5,
    borderBottom: "1px solid #e5e7eb",
  },
  currencyName: {
    fontSize: 12,
    fontWeight: 700,
    color: "#212E5B",
    fontFamily: "ArabicPDF",
    textAlign: "right",
    direction: "rtl",
  },
  currencyNet: {
    fontSize: 10,
    padding: "4px 8px",
    borderRadius: 12,
    backgroundColor: "#e6e8ef",
    color: "#212E5B",
    fontFamily: "ArabicPDF",
  },
  currencyNetNegative: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    fontFamily: "ArabicPDF",
  },
  table: {
    marginTop: 10,
    border: "1px solid #d1d5db",
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottom: "1px solid #d1d5db",
  },
  tableHeader: {
    backgroundColor: "#212E5B",
    color: "white",
    fontWeight: "bold",
  },
  tableCell: {
    padding: 6,
    fontSize: 9,
    borderLeft: "1px solid #d1d5db",
    flex: 1,
    fontFamily: "ArabicPDF",
    textAlign: "right",
    direction: "rtl",
  },
  tableCellHeader: {
    padding: 6,
    fontSize: 9,
    fontWeight: 700,
    borderLeft: "1px solid #d1d5db",
    flex: 1,
    color: "white",
    fontFamily: "ArabicPDF",
    textAlign: "right",
    direction: "rtl",
  },
  tableCellLast: {
    borderLeft: "none",
  },
  tableTotalRow: {
    flexDirection: "row-reverse",
    borderTop: "2px solid #212E5B",
    backgroundColor: "#f3f4f6",
    fontWeight: "bold",
  },
  tableTotalCell: {
    padding: 8,
    fontSize: 10,
    borderLeft: "1px solid #d1d5db",
    flex: 1,
    fontFamily: "ArabicPDF",
    textAlign: "right",
    direction: "rtl",
    fontWeight: 700,
  },
  positive: {
    color: "#16a34a",
  },
  negative: {
    color: "#dc2626",
  },
  pageBreak: {
    marginTop: 20,
  },
});

const typeLabelMap: Record<string, string> = {
  entry: "الإيداع / دخول",
  exit: "السحب / خروج",
  buy: "عمليات الشراء",
  sell_to: "عمليات البيع",
};

const formatDate = (date: Date | null): string => {
  if (!date) return "";
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export function PDFCompanyReport({
  data,
  currencyTotals,
  transactionCounts,
  dateRange,
  currencies,
  buyCurrencyData,
  sellCurrencyData,
  selectedTransactionType,
}: PDFCompanyReportProps) {
  const entryTransactions = data.filter(
    (t) => t.type === "entry" && (!t.category || t.category === "Deposit")
  );
  const exitTransactions = data.filter(
    (t) => t.type === "exit" && (!t.category || t.category === "Withdrawal")
  );
  const buyTransactions = data.filter((t) => t.type === "buy");
  const sellTransactions = data.filter((t) => t.type === "sell_to");

  // Estimate content height before first transaction type
  // Header: ~120, Transaction Counts: ~80, Currency Boxes: ~(currencies.length * 60)
  const estimatedHeaderHeight = 120;
  const estimatedCountsHeight = 80;
  const estimatedCurrencyBoxesHeight = Object.entries(currencyTotals.net).filter(([currency]) => {
    const hasDeposit = (currencyTotals.deposits[currency] || 0) > 0;
    const hasWithdrawal = (currencyTotals.withdrawals[currency] || 0) > 0;
    const hasBuy = buyCurrencyData[currency] && buyCurrencyData[currency].total > 0;
    const hasSell = sellCurrencyData[currency] && sellCurrencyData[currency].total > 0;
    return (hasDeposit || hasWithdrawal || hasBuy || hasSell) && currencies.some(c => c.name === currency);
  }).length * 60;
  const estimatedContentHeight = estimatedHeaderHeight + estimatedCountsHeight + estimatedCurrencyBoxesHeight;
  const pageHeight = 842; // A4 height in points
  const usableHeight = pageHeight - 40; // minus padding
  const shouldBreakFirstSection = estimatedContentHeight > (usableHeight * 0.75);

  // Determine which is the first transaction type
  const hasEntry = entryTransactions.length > 0 && (!selectedTransactionType || selectedTransactionType === "entry");
  const hasExit = exitTransactions.length > 0 && (!selectedTransactionType || selectedTransactionType === "exit");
  const hasBuy = buyTransactions.length > 0 && (!selectedTransactionType || selectedTransactionType === "buy");
  const hasSell = sellTransactions.length > 0 && (!selectedTransactionType || selectedTransactionType === "sell_to");
  
  const firstTransactionType = hasEntry ? "entry" : hasExit ? "exit" : hasBuy ? "buy" : hasSell ? "sell" : null;

  return (
    <Document>
      <Page
        size="A4"
        style={{
          fontFamily: "ArabicPDF",
          direction: "rtl",
          padding: 20,
          paddingBottom: 50,
        }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Image src="/applogo.png" style={styles.logo} />
          <Text style={styles.title}>تقرير الشركة - جميع المعاملات</Text>
          {(dateRange.fromDate || dateRange.toDate) && (
            <Text style={styles.dateRange}>
              {formatDate(dateRange.fromDate)} - {formatDate(dateRange.toDate)}
            </Text>
          )}
        </View>

        {/* Transaction Counts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ملخص المعاملات</Text>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>إجمالي المعاملات</Text>
              <Text style={styles.summaryValue}>{data.length}</Text>
            </View>
            {Object.entries(transactionCounts).map(([type, count]) => (
              <View key={type} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{typeLabelMap[type] ?? type}</Text>
                <Text style={styles.summaryValue}>{count}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Net Totals per Currency */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>صافي الإيداعات والسحوبات حسب العملة</Text>
          {Object.entries(currencyTotals.net)
            .filter(([currency]) => {
              // Show currency if it has at least one transaction (deposit, withdrawal, buy, or sell)
              const hasDeposit = (currencyTotals.deposits[currency] || 0) > 0;
              const hasWithdrawal = (currencyTotals.withdrawals[currency] || 0) > 0;
              const hasBuy = buyCurrencyData[currency] && buyCurrencyData[currency].total > 0;
              const hasSell = sellCurrencyData[currency] && sellCurrencyData[currency].total > 0;
              return hasDeposit || hasWithdrawal || hasBuy || hasSell;
            })
            .filter(([currency]) => currencies.some(c => c.name === currency))
            .sort(([currencyA], [currencyB]) => currencyA.localeCompare(currencyB))
            .map(([currency, netTotal]) => {
              const currencyFromTable = currencies.find((c) => c.name === currency)!;
              const deposit = currencyTotals.deposits[currency] || 0;
              const withdrawal = currencyTotals.withdrawals[currency] || 0;
              const isPositive = netTotal >= 0;

              return (
                <View key={currency} style={styles.currencyBox}>
                <View style={styles.currencyHeader}>
                  <Text style={styles.currencyName}>{currency}</Text>
                  {/* <Text
                    style={[
                      styles.currencyNet,
                      ...(!isPositive ? [styles.currencyNetNegative] : []),
                    ]}
                  >
                    {isPositive ? "صافي موجب" : "صافي سالب"}
                  </Text> */}
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>الإيداع:</Text>
                  <Text style={[styles.summaryValue, styles.positive]}>
                    +{deposit.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>السحب:</Text>
                  <Text style={[styles.summaryValue, styles.negative]}>
                    -{withdrawal.toLocaleString()}
                  </Text>
                </View>
                {/* <View style={[styles.summaryRow, { marginTop: 5, paddingTop: 5, borderTop: "1px solid #e5e7eb" }]}>
                  <Text style={styles.summaryLabel}>الصافي:</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      { fontSize: 12 },
                      isPositive ? styles.positive : styles.negative,
                    ]}
                  >
                    {isPositive ? "+" : ""}
                    {netTotal.toLocaleString()}
                  </Text>
                </View> */}
              </View>
              );
            })}
        </View>

        {/* Entry Transactions */}
        {(!selectedTransactionType || selectedTransactionType === "entry") &&
          entryTransactions.length > 0 && (
            <View {...(firstTransactionType === "entry" && shouldBreakFirstSection ? { break: true } : {})}>
              <Text style={styles.sectionTitle}>الإيداع / دخول</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]} fixed>
                  <Text style={[styles.tableCellHeader, styles.tableCellLast]}>التاريخ</Text>
                  <Text style={styles.tableCellHeader}>العميل</Text>
                  <Text style={styles.tableCellHeader}>الحساب</Text>
                  <Text style={styles.tableCellHeader}>استلمت من</Text>
                  <Text style={styles.tableCellHeader}>البلد / المدينة</Text>
                  <Text style={styles.tableCellHeader}>المبلغ</Text>
                  <Text style={styles.tableCellHeader}>العملة</Text>
                </View>
                {entryTransactions.map((t) => (
                  <View key={t.id} style={styles.tableRow} wrap={false}>
                    <Text style={[styles.tableCell, styles.tableCellLast]}>
                      {formatDate(new Date(t.created_at))}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.CustomerName ? t.CustomerName.split(" - ")[0] : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.customerAccount?.account || "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.deliver_to || ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.country_city || ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {(Number(t.amount || 0) + Number(t.fee || 0)).toLocaleString()}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.currency || "-"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        {/* Exit Transactions */}
        {(!selectedTransactionType || selectedTransactionType === "exit") &&
          exitTransactions.length > 0 && (
            <View {...(firstTransactionType === "exit" && shouldBreakFirstSection ? { break: true } : firstTransactionType !== "exit" ? { break: true } : {})}>
              <Text style={styles.sectionTitle}>السحب / خروج</Text>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]} fixed>
                  <Text style={[styles.tableCellHeader, styles.tableCellLast]}>التاريخ</Text>
                  <Text style={styles.tableCellHeader}>العميل</Text>
                  <Text style={styles.tableCellHeader}>الحساب</Text>
                  <Text style={styles.tableCellHeader}>تسليم إلى</Text>
                  <Text style={styles.tableCellHeader}>البلد / المدينة</Text>
                  <Text style={styles.tableCellHeader}>المبلغ</Text>
                  <Text style={styles.tableCellHeader}>العملة</Text>
                </View>
                {exitTransactions.map((t) => (
                  <View key={t.id} style={styles.tableRow} wrap={false}>
                    <Text style={[styles.tableCell, styles.tableCellLast]}>
                      {formatDate(new Date(t.created_at))}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.CustomerName ? t.CustomerName.split(" - ")[0] : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.customerAccount?.account || "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.deliver_to || ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.country_city || ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {(Number(t.amount || 0) + Number(t.fee || 0)).toLocaleString()}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.currency || "-"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        {/* Buy Transactions */}
        {(!selectedTransactionType || selectedTransactionType === "buy") &&
          buyTransactions.length > 0 && (
            <View {...(firstTransactionType === "buy" && shouldBreakFirstSection ? { break: true } : firstTransactionType !== "buy" ? { break: true } : {})}>
              <Text style={styles.sectionTitle}>عمليات الشراء</Text>
              {Object.keys(buyCurrencyData).length > 0 && (
                <View style={styles.summaryBox}>
                  {Object.entries(buyCurrencyData)
                    .filter(([currency]) => currencies.some((c) => c.name === currency))
                    .map(([currency, data]) => (
                      <View key={currency} style={{ marginBottom: 8 }}>
                        <Text style={styles.currencyName}>{currency}</Text>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>متوسط سعر الصرف:</Text>
                          <Text style={styles.summaryValue}>
                            {data.averageRate.toFixed(4)}
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>إجمالي المبلغ:</Text>
                          <Text style={styles.summaryValue}>
                            {data.total.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]} fixed>
                  <Text style={[styles.tableCellHeader, styles.tableCellLast]}>التاريخ</Text>
                  <Text style={styles.tableCellHeader}>العميل</Text>
                  <Text style={styles.tableCellHeader}>الحساب</Text>
                  <Text style={styles.tableCellHeader}>البلد / المدينة</Text>
                  <Text style={styles.tableCellHeader}>المبلغ الأساسي</Text>
                  <Text style={styles.tableCellHeader}>سعر الصرف</Text>
                  <Text style={styles.tableCellHeader}>المبلغ النهائي</Text>
                  <Text style={styles.tableCellHeader}>العملة</Text>
                </View>
                {buyTransactions.map((t) => (
                  <View key={t.id} style={styles.tableRow} wrap={false}>
                    <Text style={[styles.tableCell, styles.tableCellLast]}>
                      {formatDate(new Date(t.created_at))}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.CustomerName ? t.CustomerName.split(" - ")[0] : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.customerAccount?.account || "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.country_city || ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.price !== undefined ? Number(t.price).toLocaleString() : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.rate !== undefined ? Number(t.rate).toLocaleString() : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.price !== undefined && t.rate !== undefined
                        ? (Number(t.price) * Number(t.rate)).toLocaleString()
                        : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.currency || "-"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        {/* Sell Transactions */}
        {(!selectedTransactionType || selectedTransactionType === "sell_to") &&
          sellTransactions.length > 0 && (
            <View style={[styles.section, styles.pageBreak]}>
              <Text style={styles.sectionTitle}>عمليات البيع</Text>
              {Object.keys(sellCurrencyData).length > 0 && (
                <View style={styles.summaryBox}>
                  {Object.entries(sellCurrencyData)
                    .filter(([currency]) => currencies.some((c) => c.name === currency))
                    .map(([currency, data]) => (
                      <View key={currency} style={{ marginBottom: 8 }}>
                        <Text style={styles.currencyName}>{currency}</Text>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>متوسط سعر الصرف:</Text>
                          <Text style={styles.summaryValue}>
                            {data.averageRate.toFixed(4)}
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={styles.summaryLabel}>إجمالي المبلغ:</Text>
                          <Text style={styles.summaryValue}>
                            {data.total.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.tableCellHeader, styles.tableCellLast]}>التاريخ</Text>
                  <Text style={styles.tableCellHeader}>العميل</Text>
                  <Text style={styles.tableCellHeader}>الحساب</Text>
                  <Text style={styles.tableCellHeader}>البلد / المدينة</Text>
                  <Text style={styles.tableCellHeader}>المبلغ الأساسي</Text>
                  <Text style={styles.tableCellHeader}>سعر الصرف</Text>
                  <Text style={styles.tableCellHeader}>المبلغ النهائي</Text>
                  <Text style={styles.tableCellHeader}>العملة</Text>
                </View>
                {sellTransactions.map((t) => (
                  <View key={t.id} style={styles.tableRow}>
                    <Text style={[styles.tableCell, styles.tableCellLast]}>
                      {formatDate(new Date(t.created_at))}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.CustomerName ? t.CustomerName.split(" - ")[0] : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.customerAccount?.account || "-"}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.country_city || ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.price !== undefined ? Number(t.price).toLocaleString() : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.rate !== undefined ? Number(t.rate).toLocaleString() : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.price !== undefined && t.rate !== undefined
                        ? (Number(t.price) * Number(t.rate)).toLocaleString()
                        : ""}
                    </Text>
                    <Text style={styles.tableCell}>
                      {t.currency_final ?? "دينار ليبي"}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        {/* Footer with page number - using fixed View */}
        <View fixed style={styles.footer}>
          <Text style={styles.footer} render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

