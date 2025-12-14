import { useMemo } from "react";
import { Transaction } from "../components/Reports/reports";

export function useAverageFxRates(transactions: Transaction[]) {
  return useMemo(() => {
    if (!transactions?.length) return { buy: null, sell: null };

    const buyTx = transactions.filter(
      (t) => t.fx && t.fx.direction === "BUY_FROM_CUSTOMER"
    );
    const sellTx = transactions.filter(
      (t) => t.fx && t.fx.direction === "SELL_TO_CUSTOMER"
    );

    const calcAvg = (txs: Transaction[]) => {
      if (!txs.length) return null;
      const totalWeighted = txs.reduce(
        (sum, t) => sum + (t.fx!.base_amount * t.fx!.rate_used),
        0
      );
      const totalBase = txs.reduce((sum, t) => sum + t.fx!.base_amount, 0);
      return totalBase ? totalWeighted / totalBase : null;
    };

    return {
      buy: calcAvg(buyTx),
      sell: calcAvg(sellTx),
    };
  }, [transactions]);
}
