// components/transactions/AccountSelect.tsx
import React, { useEffect, useState } from "react";
import { supabase, Database } from "../../lib/supabase";
import { Select } from "../ui/Select";

type AccountOption =
  | Database["public"]["Tables"]["accounts"]["Row"]
  | {
    id: "other";
    name: string;
    category: Database["public"]["Tables"]["accounts"]["Row"]["category"] | "";
    supported_currencies?: string[];
    active?: boolean;
  };

interface AccountSelectProps {
  onSelect: (account: AccountOption) => void;
  label?: string;       // Optional custom label
  hideLabel?: boolean;  // Optional flag to hide label if external <label> exists
}

export default function AccountSelect({ onSelect, label, hideLabel }: AccountSelectProps) {
  const [accounts, setAccounts] = useState<Database["public"]["Tables"]["accounts"]["Row"][]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string | "">("");
  const [touched, setTouched] = useState(false);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("active", true);

    if (error) {
      console.error("Error fetching accounts:", error);
      setAccounts([]);
    } else {
      setAccounts(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleChange = (accountId: string) => {
    let account = accounts.find(a => a.id === accountId) as AccountOption | undefined;

    // If "other" is selected, create a dummy object
    if (accountId === "other") {
      account = { id: "other", name: "أخرى", category: "", supported_currencies: [] };
    }


    if (!account) return; // safety check

    setSelectedAccount(accountId);
    setTouched(true);
    onSelect(account);
  };

  if (loading) return <p>Loading accounts...</p>;

  return (
    <Select
      label={hideLabel ? "" : (label && label.trim() !== "" ? label : "الحساب")}
      options={[
        ...accounts.map((a) => ({
          value: a.id,
          label: `${a.name} (${a.category})`,
        })),
        { value: "other", label: "أخرى" }, // add this line
      ]}
      value={selectedAccount}
      onChange={(e) => handleChange(e.target.value)}
      error={touched && !selectedAccount ? "الرجاء اختيار الحساب" : undefined}
    />
  );
}