import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export type Database = {
  public: {
    Tables: {
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          created_at: string;
          from_account?: string | null;
          to_account?: string | null;
          ReferenceName?: string | null;
          amount: number | null;
          country_city: string;
          deliver_to?: string | null;
          paper_category: string;
          price: number | null;
          notes?: string | null;
          currency: string;
          fee?: number | null;
          rate?: number | null;
          from_account_name?: string | null;
          to_account_name?: string | null;
          account_name?: string | null;
          category?: string | null;
          fx_base_currency?: string | null;
          fx_base_amount?: number | null;
          fx_quote_currency?: string | null;
          fx_direction?: string | null;
          fee_currency?: string | null;
          CustomerName?: string | null;
          beneficiary?: string | null;
          fx_quote_amount?: number | null;
          Treasury?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          created_at?: string;
          from_account?: string | null;
          to_account?: string | null;
          ReferenceName?: string | null;
          amount?: number | null;
          country_city: string;
          deliver_to?: string | null;
          paper_category: string;
          price?: number | null;
          notes?: string | null;
          currency: string;
          fee?: number | null;
          rate?: number | null;
          from_account_name?: string | null;
          to_account_name?: string | null;
          account_name?: string | null;
          category?: string | null;
          fx_base_currency?: string | null;
          fx_base_amount?: number | null;
          fx_quote_currency?: string | null;
          fx_direction?: string | null;
          fee_currency?: string | null;
          CustomerName?: string | null;
          beneficiary?: string | null;
          fx_quote_amount?: number | null;
          Treasury?: string | null;
        };
        Update: Partial<{
          id: string;
          user_id: string;
          type: string;
          created_at: string;
          from_account?: string | null;
          to_account?: string | null;
          ReferenceName?: string | null;
          amount?: number | null;
          country_city: string;
          deliver_to?: string | null;
          paper_category: string;
          price?: number | null;
          notes?: string | null;
          currency: string;
          fee?: number | null;
          rate?: number | null;
          from_account_name?: string | null;
          to_account_name?: string | null;
          account_name?: string | null;
          category?: string | null;
          fx_base_currency?: string | null;
          fx_base_amount?: number | null;
          fx_quote_currency?: string | null;
          fx_direction?: string | null;
          fee_currency?: string | null;
          CustomerName?: string | null;
          beneficiary?: string | null;
          fx_quote_amount?: number | null;
          Treasury?: string | null;
        }>;
      }
      customers: {
        Row: {
          id: string
          name: string
          phones: string[]
          enabled_currencies: string[]
          status: "active" | "inactive"
          [key: string]: unknown
        }
        Insert: {
          name: string
          phones?: string[]
          enabled_currencies: string[]
          status?: "active" | "inactive"
        }
        Update: Partial<{
          id: string
          name: string
          phones: string[]
          enabled_currencies: string[]
          [key: string]: unknown
        }>
      }
      accounts: {
        Row: {
          id: string
          name: string
          category:
          | "بنوك ليبيا"
          | "دبي"
          | "تركيا"
          | "بنغازي"
          | "مصراتة"
          | "الزاوية";
          supported_currencies: string[]
          active: boolean
        }
        Insert: {
          name: string
          category:
          | "بنوك ليبيا"
          | "دبي"
          | "تركيا"
          | "بنغازي"
          | "مصراتة"
          | "الزاوية";
          supported_currencies: string[]
          active: boolean
        }
        Update: Partial<{
          id: string
          name: string
          category:
          | "بنوك ليبيا"
          | "دبي"
          | "تركيا"
          | "بنغازي"
          | "مصراتة"
          | "الزاوية";
          supported_currencies: string[]
          active: boolean
        }>
      }
    }
  }
}

import type { SupabaseClient } from '@supabase/supabase-js';
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey);
