// src/hooks/useTransactions.ts
import { useState, useEffect } from 'react'
import { supabase, Database } from '../lib/supabase'

export type Transaction = Database['public']['Tables']['transactions']['Row'] & {
  fee?: number
  fee_currency?: string
  fx?: {
    base_currency: string
    base_amount: number
    quote_currency: string
    quote_amount: number
    rate_used: number
    direction: 'BUY_FROM_CUSTOMER' | 'SELL_TO_CUSTOMER'
  }
}

type TransactionInsert = Database['public']['Tables']['transactions']['Insert']

export function useTransactions(
  userId: string | undefined,
  page: number = 1,
  pageSize: number = 10,
) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchTransactions = async () => {
      setLoading(true)

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      const { data, error, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('Error fetching transactions:', error)
      } else if (data) {
        const mappedData = data.map((t) => ({
          ...t,
          currency_final : t.currency_final ?? 'الدينار الليبي',
        }))

        setTransactions(mappedData)
        setTotalCount(count ?? 0)
      }

      setLoading(false)
    }

    fetchTransactions()

    const channel = supabase
      .channel(`transactions-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const t = payload.new as Transaction

          if (payload.eventType === 'INSERT') {
            setTransactions((prev) =>
              prev.some((x) => x.id === t.id) ? prev : [t, ...prev],
            )
          } else if (payload.eventType === 'UPDATE') {
            setTransactions((prev) => prev.map((x) => (x.id === t.id ? t : x)))
          } else if (payload.eventType === 'DELETE') {
            setTransactions((prev) =>
              prev.filter((x) => x.id !== payload.old.id),
            )
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, page, pageSize])

  const addTransaction = async (
    transaction: Omit<TransactionInsert, 'user_id'> & {
      category?: string
      fx?: {
        base_currency: string
        base_amount: number
        quote_currency: string
        quote_amount: number
        rate_used: number
        direction: 'BUY_FROM_CUSTOMER' | 'SELL_TO_CUSTOMER'
      }
      fee?: number
      fee_currency?: string
    },
  ): Promise<{ data: Transaction | null; error: Error | null }> => {
    if (!userId)
      return { data: null, error: new Error('User not authenticated') }

    try {
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({ ...transaction, user_id: userId })
        .select()
        .single()

      if (txError) return { data: null, error: txError }
      if (!tx)
        return { data: null, error: new Error('Failed to insert transaction') }

      if (transaction.category === 'FX' && transaction.fx) {
        const { error: fxError } = await supabase
          .from('transaction_fx')
          .insert({
            transaction_id: tx.id,
            direction: transaction.fx.direction,
            base_currency: transaction.fx.base_currency,
            base_amount: transaction.fx.base_amount,
            quote_currency: transaction.fx.quote_currency,
            quote_amount: transaction.fx.quote_amount,
            rate_used: transaction.fx.rate_used,
            fee: transaction.fee,
            fee_currency: transaction.fee_currency,
          })
        if (fxError) {
          console.error('Error inserting FX transaction:', fxError)
          return { data: tx as Transaction, error: fxError }
        }
      }

      return { data: tx as Transaction, error: null }
    } catch (err) {
      console.error('Add transaction error:', err)
      return { data: null, error: err as Error }
    }
  }

  const updateTransaction = async (
    id: string,
    updates: Partial<Transaction>,
  ) => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      return { data, error }
    } catch (err) {
      console.error('Update transaction error:', err)
      return { data: null, error: err as Error }
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
      return { error }
    } catch (err) {
      console.error('Delete transaction error:', err)
      return { error: err as Error }
    }
  }

  return {
    transactions,
    loading,
    totalCount,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
