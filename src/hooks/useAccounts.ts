import { useEffect, useState } from "react";
import { supabase, Database } from "../lib/supabase";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

export function useAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const { data, error } = await supabase
          .from("accounts")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching accounts:", error);
        } else {
          setAccounts(data || []);
        }
      } catch (err) {
        console.error("Unexpected error fetching accounts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  return { accounts, loading };
}
