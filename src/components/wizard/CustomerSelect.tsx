// components/transactions/CustomerSelect.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import CreatableSelect from "react-select/creatable";
import { SingleValue } from "react-select";

interface CustomerSelectProps {
  onSelect: (customer: { id: string; name: string }) => void;
  label?: string;
  type?: string;
}

interface OptionType {
  value: string;
  label: string;
}

interface CustomerInsert {
  name: string;
  phones?: string[];
  enabled_currencies?: string[];
  status?: string;
  treasury?: string;
  currency?: string;
}

export default function CustomerSelect({
  onSelect,
  label,
  type,
}: CustomerSelectProps) {
  const [customers, setCustomers] = useState<{ id?: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<OptionType | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const [treasuries, setTreasuries] = useState<{ id: string; name: string }[]>([]);
  const [currencies, setCurrencies] = useState<{ id: string; name: string }[]>([]);
  const [selectedTreasury, setSelectedTreasury] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");

  //  Fetch customers based on type
  const fetchCustomers = async () => {
    setLoading(true);

    try {
      if (type === "buy" || type === "sell_to") {
        const { data, error } = await supabase
          .from("treasury_categories")
          .select("id, name");
        if (error) throw error;

        const formatted = (data ?? []).map((item) => ({
          id: item.id,
          name: item.name,
        }));
        setCustomers(formatted);

        // fetch treasuries and currencies
        const [treasuryRes, currencyRes] = await Promise.all([
          supabase.from("treasury_categories").select("id, name"),
          supabase.from("currencies").select("id, name"),
        ]);

        if (!treasuryRes.error && treasuryRes.data) setTreasuries(treasuryRes.data);
        if (!currencyRes.error && currencyRes.data) setCurrencies(currencyRes.data);
      } else if (type === "entry" || type === "exit") {
        const { data, error } = await supabase
          .from("customers_accounts")
          .select("customer, account, currency");
        if (error) throw error;

        const formatted = (data ?? []).map((item, index) => ({
          id: String(index),
          name: `${item.customer} - ${item.account} - ${item.currency}`,
        }));
        setCustomers(formatted);

        //  Fetch treasuries and currencies for the dropdowns
        const [treasuryRes, currencyRes] = await Promise.all([
          supabase.from("treasury_categories").select("id, name"),
          supabase.from("currencies").select("id, name"),
        ]);
        if (!treasuryRes.error && treasuryRes.data) setTreasuries(treasuryRes.data);
        if (!currencyRes.error && currencyRes.data) setCurrencies(currencyRes.data);
      }


    } catch (err) {
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [type]);

  const handleChange = (newValue: SingleValue<OptionType>) => {
    if (!newValue) {
      setSelectedCustomer(null);
      setShowNewCustomerForm(false);
      return;
    }

    if (newValue.value === "create_new") {
      setNewCustomerName(inputValue);
      setShowNewCustomerForm(true);
      setSelectedCustomer(null);
    } else {
      setSelectedCustomer(newValue);
      setShowNewCustomerForm(false);
      onSelect({ id: newValue.value, name: newValue.label });
    }
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomerName) return;

    try {
      const table = type === "buy" || type === "sell_to" ? "treasury_categories" : "customers";
      const insertData: CustomerInsert =
        type === "buy" || type === "sell_to"
          ? { name: newCustomerName }
          : {
            name: newCustomerName,
            phones: newCustomerPhone ? [newCustomerPhone] : [],
            enabled_currencies: [],
            status: "active",
          };

      // Insert into main table
      const { data, error } = await supabase
        .from(table)
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // If type is entry/exit, also insert into customers_accounts
      if ((type === "entry" || type === "exit") && selectedTreasury && selectedCurrency) {
        const { data: accountData, error: accountError } = await supabase
          .from("customers_accounts")
          .insert([
            {
              customer: newCustomerName,
              account: selectedTreasury,
              currency: selectedCurrency,
            },
          ])
          .select()
          .single();

        if (accountError) throw accountError;

        console.log("Inserted into customers_accounts:", accountData);
      }

      // Update state
      const createdCustomer = { value: data.id, label: data.name };
      setCustomers([...customers, data]);
      setSelectedCustomer(createdCustomer);
      onSelect({ id: data.id, name: data.name });

      // Reset form
      setShowNewCustomerForm(false);
      setInputValue("");
      setNewCustomerName("");
      setNewCustomerPhone("");
      setSelectedTreasury("");
      setSelectedCurrency("");
    } catch (err) {
      console.error("Error creating customer:", err);
    }
  };



  const filteredOptions: OptionType[] = [
    ...customers.map((c) => ({ value: c.id!, label: c.name })),
    ...(inputValue &&
      !customers.some((c) =>
        c.name.toLowerCase().includes(inputValue.toLowerCase())
      )
      ? [{ value: "create_new", label: `انشاء "${inputValue}"` }]
      : []),
  ];

  if (loading) return <p>Loading customers...</p>;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1 mt-2">
        {label || "العميل"}
      </label>

      <CreatableSelect
        value={selectedCustomer}
        onChange={handleChange}
        onInputChange={(value) => setInputValue(value)}
        options={filteredOptions}
        placeholder="ابحث عن العميل أو اكتب لإضافة جديد..."
        isClearable
        formatCreateLabel={() => null}
        styles={{
          control: (base) => ({
            ...base,
            borderRadius: "12px",
            textAlign: "right",
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
            borderColor: "#d1d5db",
            "&:hover": { borderColor: "#2563eb" },
          }),
          input: (base) => ({ ...base, textAlign: "right" }),
          singleValue: (base) => ({ ...base, textAlign: "right" }),
          menu: (base) => ({ ...base, borderRadius: "12px" }),
        }}
      />

      {showNewCustomerForm && (
        <div className="mt-3 p-3 border border-gray-300 rounded-xl shadow-sm bg-white space-y-2">
          <label className="block text-sm font-medium text-gray-700">اسم العميل</label>
          <input
            type="text"
            value={newCustomerName}
            onChange={(e) => setNewCustomerName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          />

          <label className="block text-sm font-medium text-gray-700">رقم الهاتف</label>
          <input
            type="text"
            value={newCustomerPhone}
            onChange={(e) => setNewCustomerPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          />

          {(type === "entry" || type === "exit") && (
            <>
              <label className="block text-sm font-medium text-gray-700">الخزينة</label>
              <select
                value={selectedTreasury}
                onChange={(e) => setSelectedTreasury(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              >
                <option value="">اختر الخزينة</option>
                {treasuries.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700">العملة</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              >
                <option value="">اختر العملة</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}


          <button
            onClick={handleCreateNewCustomer}
            className="mt-2 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            إضافة العميل
          </button>
        </div>
      )}



    </div>
  );
}
