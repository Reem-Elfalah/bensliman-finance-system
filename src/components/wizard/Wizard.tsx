// src/components/wizard/Wizard.tsx
import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import CustomerSelect from "./CustomerSelect";
import AccountSelect from "./AccountSelect";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from "../../lib/supabase";

// --- Types ---
export type TransactionType = "exit" | "sell_to" | "buy" | "entry";
export type TransactionCategory = "Deposit" | "Withdrawal" | "FX" | "Transfer";

export interface FXData {
  baseCurrency: string;
  baseAmount: number | string;
  quoteCurrency: string;
  quoteAmount: number | string;
  rateUsed: number | string;
  direction: "BUY_FROM_CUSTOMER" | "SELL_TO_CUSTOMER";
}
export interface WizardFormData {
  customer_id: number | null;
  customer: string;
  CustomerName?: string;
  fromAccount: string;
  fromAccountName?: string;
  fromAccountObject?: Account;
  toAccount: string | number;
  toAccountName?: string;
  toAccountObject?: Account;
  deliverTo?: string;
  deliverToObject?: Account;
  accountName?: string;
  dateTime: string;
  reference: string;
  notes: string;
  type?: TransactionType;
  amount?: number | string;
  currency: string;
  beneficiary?: string;
  paper_category?: string;
  category?: TransactionCategory;
  fee?: number | string;
  feeCurrency?: string;
  fx?: FXData;
  country_city?: string;
  price?: number | string;
  rate?: number | string;
  currency_t?: string;
  Treasury?: string;
  customAccount?: string;
  treasuryCategory?: { id: string; name: string };
  customerAccount?: { name: string; account: string; currency: string; };
  currency_final?: string;
}

export interface TransactionInsert {
  customerAccount: { name: string; account: string; currency: string } | null;
  id?: string;
  user_id: string;
  from_account: string;
  from_account_name?: string;
  to_account?: string;
  to_account_name?: string;
  account_name?: string;
  created_at?: string;
  ReferenceName?: string;
  deliver_to?: string;
  notes?: string;
  amount?: number;
  currency?: string;
  fee?: number;
  fee_currency?: string;
  paper_category?: string;
  price?: number;
  country_city?: string;
  category: TransactionCategory;
  type: TransactionType;
  fx_base_currency?: string;
  fx_base_amount?: number;
  fx_quote_currency?: string;
  fx_quote_amount?: number;
  fx_direction?: "BUY_FROM_CUSTOMER" | "SELL_TO_CUSTOMER";
  rate?: number;
  CustomerName?: string;
  beneficiary?: string;
  Treasury?: string | null;
  custom_account?: string;
  customer_id?: number | null;
  currency_final?: string;
}
export interface TransactionFXInsert {
  transaction_id?: string;
  customer_id: string;
  from_account: string;
  to_account?: string;
  base_currency: string;
  base_amount: number;
  quote_currency: string;
  quote_amount: number;
  direction: "BUY_FROM_CUSTOMER" | "SELL_TO_CUSTOMER";
  rate: number;
  fee?: number;
  fee_currency?: string;
}

interface Account {
  id: number;
  name: string;
  customer: string
  account: string;
  currency: string;
  supported_currencies: string[];
}

interface WizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialType: TransactionType;
  onSubmit?: (data: TransactionInsert) => void;
  onSubmitFX?: (data: TransactionFXInsert) => void;
}

// SearchableDropdown Component
interface SearchableDropdownOption {
  label: string;
  value: string;
}

interface Currency {
  id: number;
  name: string;
}

interface SearchableDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableDropdownOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  label?: string;
  allowCustom?: boolean;
  onCustomInput?: (value: string) => void;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = "ابحث واختر...",
  disabled = false,
  error,
  className = "",
  label,
  allowCustom = false,
  onCustomInput,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isCustomInput, setIsCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (allowCustom && value && !options.find((opt) => opt.value === value)) {
      setIsCustomInput(true);
    } else {
      setIsCustomInput(false);
    }
  }, [value, options, allowCustom]);

  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find((opt) => opt.value === value);




  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        if (isCustomInput && searchTerm) {
          onChange(searchTerm);
          if (onCustomInput) onCustomInput(searchTerm);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCustomInput, searchTerm, onChange, onCustomInput]);



  const handleSelect = (option: SearchableDropdownOption) => {
    if (allowCustom && option.value === "أخرى") {
      setIsCustomInput(true);
      setSearchTerm("");
      onChange("custom");
      setIsOpen(false);
      if (inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    } else {
      onChange(option.value);
      setSearchTerm("");
      setIsOpen(false);
      setHighlightedIndex(-1);
      setIsCustomInput(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);

    if (isCustomInput) {
      onChange(newValue);
      if (onCustomInput) onCustomInput(newValue);
    } else {
      setHighlightedIndex(-1);
      if (!isOpen) setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (!isCustomInput) {
      setSearchTerm("");
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && !isCustomInput) return;

    switch (e.key) {
      case "ArrowDown":
        if (!isCustomInput) {
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case "ArrowUp":
        if (!isCustomInput) {
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case "Enter":
        e.preventDefault();
        if (isCustomInput && searchTerm) {
          onChange(searchTerm);
          if (onCustomInput) onCustomInput(searchTerm);
          setIsOpen(false);
          setSearchTerm("");
        } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        if (isCustomInput) {
          setIsCustomInput(false);
          onChange("");
        }
        break;
    }
  };

  const displayOptions = allowCustom
    ? [...filteredOptions, { label: "أخرى", value: "أخرى" }]
    : filteredOptions;

  const getInputValue = () => {
    if (isOpen && isCustomInput) return searchTerm;
    if (isCustomInput) return value;
    return selectedOption?.label || "";
  };



  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={getInputValue()}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={
            isCustomInput
              ? "اكتب اسم الخزينة..."
              : selectedOption
                ? selectedOption.label
                : placeholder
          }
          disabled={disabled}
          className={`
            w-full px-4 py-3 border border-gray-300 rounded-xl 
            shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
            text-gray-800 text-right text-sm
            bg-white transition-all duration-200
            hover:border-gray-400
            disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error
              ? "border-red-500 focus:ring-red-500 focus:border-red-500"
              : ""
            }
            ${isCustomInput ? "border-blue-500 bg-blue-50" : ""}
          `}
        />

        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
              }
            `}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {isOpen && displayOptions.length > 0 && !isCustomInput && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg max-h-60 overflow-auto">
          {displayOptions.map((option, index) => (
            <div
              key={option.value}
              className={`
                px-4 py-3 text-right cursor-pointer transition-colors duration-150
                ${index === highlightedIndex
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-50"
                }
                ${option.value === value ? "bg-blue-100 text-blue-800" : ""}
                ${option.value === "أخرى"
                  ? "border-t border-gray-200 mt-1 pt-3 font-medium text-blue-600"
                  : ""
                }
              `}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}

      {isOpen && displayOptions.length === 0 && !isCustomInput && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-xl shadow-lg">
          <div className="px-4 py-3 text-right text-gray-500">
            لا توجد نتائج
          </div>
        </div>
      )}

      {isCustomInput && (
        <div className="absolute z-40 w-full mt-1 bg-blue-50 border border-blue-300 rounded-xl shadow-lg p-2">
          <div className="text-right text-sm text-blue-700">
            ⓘ وضع الإدخال المخصص: اكتب اسم الخزينة
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-xs mt-2 text-right">{error}</p>}
    </div>
  );
};

export function Wizard({
  isOpen,
  onClose,
  initialType,
  onSubmit,
}: WizardProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<TransactionCategory>();
  const [setSelectedAccount] = useState<Account | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [, setCustomAccountName] = useState("");

  // const TreasuryOptions: SearchableDropdownOption[] = [
  //   { label: "بنوك ليبيا", value: "بنوك ليبيا" },
  //   { label: "دبي", value: "دبي" },
  //   { label: "تركيا", value: "تركيا" },
  //   { label: "بنغازي", value: "بنغازي" },
  //   { label: "مصراتة", value: "مصراتة" },
  //   { label: "الزاوية", value: "الزاوية" },
  // ];

  useEffect(() => {
    if (initialType === "entry") setSelectedCategory("Deposit");
  }, [initialType]);

  // Fetch accounts when modal opens
  useEffect(() => {
    const fetchAccounts = async () => {
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
    };

    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen]);

  // Currency options - Show all currencies when custom account is selected
  const currencyOptions: SearchableDropdownOption[] = [
    // { label: "دينار", value: "دينار" }, //commented out for now 
    { label: "دولار", value: "دولار" },
    { label: "يورو", value: "يورو" },
    { label: "باوند", value: "باوند" },
    { label: "ليرة تركية", value: "ليرة تركية" },
    { label: "جني المصري", value: "جني المصري" },
    { label: "دينار التونسي", value: "دينار التونسي" },
    { label: "الدرهم الإماراتي", value: "الدرهم الإماراتي" },
    { label: "غرام فضة", value: "غرام فضة" },
    { label: "غرام ذهب", value: "غرام ذهب" },
  ];

  const [formData, setFormData] = useState<WizardFormData>({
    customer_id: null,
    customer: "",
    CustomerName: "",
    fromAccount: "",
    fromAccountName: "",
    fromAccountObject: undefined,
    toAccount: "",
    toAccountName: "",
    toAccountObject: undefined,
    deliverTo: "",
    deliverToObject: undefined,
    accountName: "",
    dateTime: new Date().toISOString().slice(0, 16),
    reference: "",
    notes: "",
    amount: "",
    currency: "",
    fee: 0,
    feeCurrency: "LYD",
    fx: {
      baseCurrency: "",
      baseAmount: "",
      quoteCurrency: "",
      quoteAmount: "",
      rateUsed: "",
      direction: "BUY_FROM_CUSTOMER",
    },
    country_city: "",
    price: "",
    paper_category: "غير محدد",
    Treasury: "",
    customAccount: "",
  });

  useEffect(() => {
    let selectedCity = "";

    if (initialType === "entry") {
      selectedCity =
        formData.toAccountObject?.account ||
        formData.customAccount ||
        "";
    } else if (["exit", "sell_to", "buy"].includes(initialType)) {
      selectedCity = formData.customerAccount?.account || "";
    }

    if (selectedCity !== formData.country_city) {
      setFormData(prev => ({
        ...prev,
        country_city: selectedCity,
      }));
    }
  }, [
    formData.toAccountObject,
    formData.customAccount,
    formData.customerAccount,
    formData.country_city,
    initialType,
  ]);


  useEffect(() => {
    setCurrentUser("current-user-id");
  }, []);

  const [customerAccounts, setCustomerAccounts] = useState<any[]>([]);

  useEffect(() => {
    const fetchCustomerAccounts = async () => {
      const { data, error } = await supabase
        .from("customers_accounts")
        .select("*");

      if (error) {
        console.error("Error fetching customer accounts:", error);
      } else {
        setCustomerAccounts(data);
        console.log("Customer accounts fetched:", data);
      }
    };

    fetchCustomerAccounts();
  }, []);


  // Handle custom account input
  const handleCustomAccountInput = (value: string) => {
    setCustomAccountName(value);
    setFormData((prev) => ({
      ...prev,
      toAccount: value,
      toAccountName: value,
      customAccount: value,
      toAccountObject: undefined,
    }));
  };

  const handleCustomFromAccountInput = (value: string) => {
    setCustomAccountName(value);
    setFormData((prev) => ({
      ...prev,
      fromAccount: value,
      fromAccountName: value,
      customAccount: value,
      fromAccountObject: undefined,
    }));
  };

  const amount =
    formData.price && formData.rate && formData.currency
      ? formData.currency.trim() === "رممبي" 
        ? parseFloat(String(formData.price)) / parseFloat(String(formData.rate)) // divide
        : parseFloat(String(formData.price)) * parseFloat(String(formData.rate)) // multiply
      : "";



  const getSupportedCurrencies = () => {
    const isCustomToAccount =
      formData.toAccount &&
      formData.toAccount !== "custom" &&
      !accounts.find((acc) => acc.id === formData.toAccount);

    const isCustomFromAccount =
      formData.fromAccount &&
      formData.fromAccount !== "custom" &&
      !accounts.find((acc) => acc.id === formData.fromAccount);

    if (isCustomToAccount || isCustomFromAccount || formData.customAccount) {
      return currencyOptions;
    }

    if (initialType === "entry") {
      const account = accounts.find((acc) => acc.id === formData.toAccount);
      return (
        account?.supported_currencies?.map((c) => ({ label: c, value: c })) ||
        []
      );
    }

    if (initialType === "exit") {
      const account = accounts.find((acc) => acc.id === formData.fromAccount);
      return (
        account?.supported_currencies?.map((c) => ({ label: c, value: c })) ||
        []
      );
    }

    return currencyOptions;
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // Customer validation
    // if (!formData.customer || typeof formData.customer !== "string" || !formData.customer.trim()) {
    //   newErrors.customer = "الرجاء اختيار العميل";
    // }

    // Date validation
    if (!formData.dateTime?.trim()) {
      newErrors.dateTime = "الرجاء إدخال التاريخ";
    } else if (isNaN(new Date(formData.dateTime).getTime())) {
      newErrors.dateTime = "صيغة التاريخ غير صحيحة";
    }
    // Country / City validation
    // if (!formData.country_city?.trim()) {
    //   newErrors.country_city = "الرجاء إدخال البلد / المدينة";
    // }
    // Treasury validation for buy/sell_to
    // if (
    //   (initialType === "buy" || initialType === "sell_to") &&
    //   !formData.Treasury?.trim()
    // ) {
    //   newErrors.Treasury = "الرجاء اختيار مكان الخزينة";
    // }

    // Buy / Sell validations
    if (
      (initialType === "buy" || initialType === "sell_to") &&
      (!formData.rate || Number(formData.rate) <= 0)
    ) {
      newErrors.rate = "الرجاء إدخال سعر الصرف";
    }


    // Account validations
    // if (initialType === "entry" && !formData.toAccount?.trim()) {
    //   newErrors.toAccount = "الرجاء اختيار الحساب";
    // }
    // if (initialType === "exit" && !formData.fromAccount?.trim()) {
    //   newErrors.fromAccount = "الرجاء اختيار الحساب";
    // }

    // DeliverTo / beneficiary
    if (initialType === "exit" && !formData.deliverTo?.trim()) {
      newErrors.deliverTo = "الرجاء إدخال اسم المستلم";
    }
    if (selectedCategory === "Transfer" && !formData.beneficiary?.trim()) {
      newErrors.beneficiary = "الرجاء إدخال اسم المستفيد";
    }

    // FX validations
    if (selectedCategory === "FX" && formData.fx) {
      if (!formData.fx.baseAmount) {
        newErrors.baseAmount = "الرجاء إدخال المبلغ الأساسي";
      }
      if (!formData.fx.baseCurrency?.trim()) {
        newErrors.baseCurrency = "الرجاء إدخال العملة الأساسية";
      }
      if (!formData.fx.quoteAmount) {
        newErrors.quoteAmount = "الرجاء إدخال المبلغ النهائي";
      }
      if (!formData.fx.quoteCurrency?.trim()) {
        newErrors.quoteCurrency = "الرجاء إدخال العملة النهائية";
      }
      if (!formData.fx.rateUsed) {
        newErrors.rateUsed = "الرجاء إدخال سعر الصرف";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const newErrors = { ...prev };
      switch (name) {
        case "customer":
          if (!value.trim()) newErrors.customer = "الرجاء اختيار العميل";
          else delete newErrors.customer;
          break;
        case "dateTime":
          if (!value.trim()) newErrors.dateTime = "الرجاء إدخال التاريخ";
          else if (isNaN(new Date(value).getTime()))
            newErrors.dateTime = "صيغة التاريخ غير صحيحة";
          else delete newErrors.dateTime;
          break;
        case "country_city":
          if (!value.trim())
            newErrors.country_city = "الرجاء إدخال البلد / المدينة";
          else delete newErrors.country_city;
          break;
        case "Treasury":
          if (
            (initialType === "buy" || initialType === "sell_to") &&
            !value.trim()
          )
            newErrors.Treasury = "الرجاء اختيار مكان الخزينة";
          else delete newErrors.Treasury;
          break;
        case "rate":
          if (
            (initialType === "buy" || initialType === "sell_to") &&
            Number(value) <= 0
          )
            newErrors.rate = "الرجاء إدخال سعر الصرف";
          else delete newErrors.rate;
          break;
        case "toAccount":
          if (initialType === "entry" && !value.trim())
            newErrors.toAccount = "الرجاء اختيار الحساب";
          else delete newErrors.toAccount;
          break;
        case "fromAccount":
          if (initialType === "exit" && !value.trim())
            newErrors.fromAccount = "الرجاء اختيار الحساب";
          else delete newErrors.fromAccount;
          break;
        case "deliverTo":
          if (initialType === "exit" && !value.trim())
            newErrors.deliverTo = "الرجاء إدخال اسم المستلم";
          else delete newErrors.deliverTo;
          break;
        case "beneficiary":
          if (selectedCategory === "Transfer" && !value.trim())
            newErrors.beneficiary = "الرجاء إدخال اسم المستفيد";
          else delete newErrors.beneficiary;
          break;
        default:
          break;
      }
      return newErrors;
    });
  };

  const handleFXChange = (field: keyof FXData, value: string | number) => {
    setFormData((prev) => ({ ...prev, fx: { ...prev.fx!, [field]: value } }));
  };

  const handleCustomerSelect = (customer: { id: string; name: string }) => {
    // Split the name into parts if it contains " - "
    const parts = customer.name.split(" - ");
    const customerName = parts[0] || customer.name;
    const city = parts[1] || "Unknown";
    const currency = parts[2] || "";

    // Update formData
    setFormData(prev => ({
      ...prev,
      customer: customer.id,
      CustomerName: customer.name,
      customerAccount: {
        name: customerName,
        account: city,
        currency: currency,
      },
    }));

    console.log("Customer selected:", customer.id, customer.name, city, currency);
  };



  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setFormData((prev) => ({
      ...prev,
      fromAccount: account.id,
      fromAccountName: account.name,
      fromAccountObject: account,
    }));
  };

  const categoryTranslations = {
    Deposit: "إيداع",
    Withdrawal: "سحب",
    FX: "صرافة",
    Transfer: "تحويل",
  } as const;

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("دينار ليبي");

  useEffect(() => {
    const fetchCurrencies = async () => {
      const { data, error } = await supabase
        .from<Currency>("currencies")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching currencies:", error);
      } else if (data) {
        setCurrencies(data);

        //  set default  "الدينار الليبي" 
        const defaultCurrency = data.find(c => c.name === "دينار ليبي");
        if (defaultCurrency) setSelectedCurrency(defaultCurrency.name);
      }
    };

    fetchCurrencies();
  }, []);


  const handleFinish = async () => {
    if (!currentUser) return;

    if (!formData.customer_id) {
      console.error("Cannot insert: customer_id is missing!");
      return;
    }

    console.log("DEBUG - Form data before submit:", formData);

    const categoryToUse = selectedCategory || "Other";

    // Determine city/country based on transaction type
    let city = "";
    switch (initialType) {
      case "exit":
      case "sell_to":
      case "buy":
        city = formData.customerAccount?.account?.split(" - ")[1] || "";
        break;

      case "entry":
        city =
          formData.toAccountObject?.account?.split(" - ")[1] ||
          formData.customAccount?.split(" - ")[1] ||
          "";
        break;

      default:
        city = "";
    }

    // Prepare the transaction object
    const transactionData: TransactionInsert = {
      customer_id: formData.customer_id,
      user_id: currentUser,
      from_account: formData.fromAccount,
      from_account_name: formData.fromAccountName,
      to_account: formData.toAccount,
      to_account_name: formData.toAccountName,
      account_name: formData.accountName,
      created_at: formData.dateTime,
      ReferenceName: formData.reference,
      deliver_to: formData.deliverTo,
      notes: formData.notes || "Optional",
      amount: formData.amount ? Number(formData.amount) : undefined,
      Treasury: formData.Treasury || null,
      fee: formData.fee ? Number(formData.fee) : undefined,
      fee_currency: formData.feeCurrency,
      paper_category: formData.paper_category || "",
      price: formData.price ? Number(formData.price) : undefined,
      rate: formData.rate ? Number(formData.rate) : undefined,
      country_city: formData.country_city,
      category: categoryToUse as TransactionCategory,
      type: initialType,
      CustomerName: formData.CustomerName || "غير محدد",
      beneficiary: formData.beneficiary || "",
      custom_account: formData.customAccount || undefined,
      currency: formData.currency,
      customerAccount: formData.customerAccount ?? null,
      currency_final: selectedCurrency,

    };

    console.log("FINAL transactionData to submit:", JSON.stringify(transactionData, null, 2));

    if (onSubmit) {
      await onSubmit(transactionData);
    } else {
      console.error("onSubmit prop is not provided to Wizard!");
    }
  };

  console.log("formData.currency:", `"${formData.currency}"`, "Calculated amount:", amount);


  const handleFinishClick = async () => {
    const isValid = validateForm();
    console.log("Validation errors:", errors);

    if (!isValid) {
      console.log("Form validation failed");
      return;
    }

    setIsSubmitting(true);

    try {
      await handleFinish();
      console.log("Transaction saved successfully");

      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error(" Error saving transaction:", error);
      setIsSubmitting(false);
    }
  };


  if (!isOpen) return null;

  const typeTranslations: Record<TransactionType, string> = {
    entry: "دخول",
    exit: "خروج",
    sell_to: "بيع الى",
    buy: "شراء من",
  };

  // Input field styling for consistency
  const inputClassName =
    "w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 text-right text-sm transition-all duration-200 hover:border-gray-400";
  const labelClassName =
    "block text-sm font-medium text-gray-700 mb-2 text-right";

  // FX Direction options
  const fxDirectionOptions: SearchableDropdownOption[] = [
    { label: "شراء من العميل", value: "BUY_FROM_CUSTOMER" },
    { label: "البيع للعميل", value: "SELL_TO_CUSTOMER" },
  ];

  // Account options for searchable dropdown with "أخرى" option
  const accountOptions = accounts.map((account) => ({
    value: account.id,
    label: `${account.name} (${account.category})`,
  }));

  // Check if custom account is selected
  const isCustomToAccount =
    formData.toAccount &&
    formData.toAccount !== "custom" &&
    !accounts.find((acc) => acc.id === formData.toAccount);

  const isCustomFromAccount =
    formData.fromAccount &&
    formData.fromAccount !== "custom" &&
    !accounts.find((acc) => acc.id === formData.fromAccount);


  // --- Single step ---

  const StepContent = () => (
    <div className="space-y-6">
      {/* Customer Selection based on transaction type */}
      {initialType === "exit" && (

        <div className="space-y-2">

          <CustomerSelect
            onSelect={(selected: { id: string; name: string }) => {
              // Debug 
              console.log("Customer selected from wizard:", selected);

              const [customerName, accountName, currencyName] = selected.name.split(" - ");
              console.log("Parsed values:", customerName, accountName, currencyName);

              const matchedAccount = customerAccounts.find(
                acc =>
                  acc.customer === customerName &&
                  acc.account === accountName &&
                  acc.currency === currencyName
              );
              console.log("Matched account:", matchedAccount);

              setFormData(prev => ({
                ...prev,
                customer_id: matchedAccount ? matchedAccount.id : null,
                customerAccount: matchedAccount
                  ? { name: matchedAccount.customer, account: matchedAccount.account, currency: matchedAccount.currency }
                  : { name: customerName, account: accountName, currency: currencyName },
                currency: matchedAccount ? matchedAccount.currency : currencyName,
                CustomerName: matchedAccount ? matchedAccount.customer : customerName,
                country_city: matchedAccount?.account || accountName,
              }));
              console.log("FormData after set:", {
                customer_id: matchedAccount ? matchedAccount.id : null,
                customerAccount: matchedAccount
                  ? { name: matchedAccount.customer, account: matchedAccount.account, currency: matchedAccount.currency }
                  : { name: customerName, account: accountName, currency: currencyName },
              });
            }}
            label="الحساب"
            type={initialType}
          />



          {errors.customer && (
            <p className="text-red-500 text-sm mt-1 text-right">
              {errors.customer}
            </p>
          )}
        </div>

      )}

      {(initialType === "buy" || initialType === "sell_to") && (
        <div className="space-y-2">
          <CustomerSelect
            onSelect={(selected: { id: string; name: string }) => {
              console.log("Customer selected from wizard:", selected);

              const [customerName, accountName, currencyName] = selected.name.split(" - ");
              console.log("Parsed values:", customerName, accountName, currencyName);

              const matchedAccount = customerAccounts.find(
                acc =>
                  acc.customer === customerName &&
                  acc.account === accountName &&
                  acc.currency === currencyName
              );
              console.log("Matched account:", matchedAccount);

              const selectedAccount = accounts.find(acc => acc.name === selected.name);

              setFormData(prev => ({
                ...prev,
                customer_id: matchedAccount ? matchedAccount.id : null,
                customerAccount: matchedAccount
                  ? { name: matchedAccount.customer, account: matchedAccount.account, currency: matchedAccount.currency }
                  : { name: customerName, account: accountName, currency: currencyName },
                currency: matchedAccount ? matchedAccount.currency : currencyName,
                CustomerName: matchedAccount ? matchedAccount.customer : customerName,
                country_city: matchedAccount?.account || accountName,
              }));

              console.log("FormData after set:", {
                customer_id: matchedAccount ? matchedAccount.id : null,
                customerAccount: matchedAccount
                  ? { name: matchedAccount.customer, account: matchedAccount.account, currency: matchedAccount.currency }
                  : { name: customerName, account: accountName, currency: currencyName },
              });
            }}
            label="الحساب"
            type="exit"
          />

          {errors.customer && (
            <p className="text-red-500 text-sm mt-1 text-right">
              {errors.customer}
            </p>
          )}
        </div>

      )}

      {/* Only show default AccountSelect for non-entry/exit */}
      {initialType !== "exit" &&
        initialType !== "entry" &&
        initialType !== "buy" &&
        initialType !== "sell_to" && (
          <AccountSelect onSelect={handleAccountSelect} />
        )}

      {/* Entry type "في الحساب" + "استلمت من" */}

      {initialType === "entry" && (
        <div className="space-y-4">

          <div className="space-y-2">
            <CustomerSelect
              onSelect={(selected: { id: string; name: string }) => {
                // Debug
                console.log("Customer selected from wizard:", selected);

                const [customerName, accountName, currencyName] = selected.name.split(" - ");
                console.log("Parsed values:", customerName, accountName, currencyName);

                const matchedAccount = customerAccounts.find(
                  acc =>
                    acc.customer === customerName &&
                    acc.account === accountName &&
                    acc.currency === currencyName
                );
                console.log("Matched account:", matchedAccount);

                const selectedAccount = accounts.find(acc => acc.name === selected.name);

                setFormData(prev => ({
                  ...prev,
                  customer_id: matchedAccount ? matchedAccount.id : null,
                  toAccount: selectedAccount?.id || "",
                  toAccountName: selectedAccount?.name || customerName,
                  toAccountObject: selectedAccount,
                  customAccount: selectedAccount ? "" : accountName,
                  currency: selectedAccount?.currency || currencyName,
                  CustomerName: selectedAccount ? selectedAccount.name : customerName,
                  country_city: selectedAccount?.account || accountName,
                  // Added customerAccount for consistency
                  customerAccount: matchedAccount
                    ? { name: matchedAccount.customer, account: matchedAccount.account, currency: matchedAccount.currency }
                    : { name: customerName, account: accountName, currency: currencyName },
                }));

                setCustomAccountName(selectedAccount ? "" : accountName);

                // Debug after set
                console.log("FormData after set:", {
                  customer_id: matchedAccount ? matchedAccount.id : null,
                  toAccount: selectedAccount?.id || "",
                  toAccountName: selectedAccount?.name || customerName,
                  currency: selectedAccount?.currency || currencyName,
                  CustomerName: selectedAccount ? selectedAccount.name : customerName,
                  country_city: selectedAccount?.account || accountName,
                  customerAccount: matchedAccount
                    ? { name: matchedAccount.customer, account: matchedAccount.account, currency: matchedAccount.currency }
                    : { name: customerName, account: accountName, currency: currencyName },
                });
              }}
              label="الحساب"
              type={initialType}
            />
            {errors.toAccount && (
              <p className="text-red-500 text-sm mt-1 text-right">
                {errors.toAccount}
              </p>
            )}
          </div>


          <div>
            <label className={labelClassName}>استلمت من</label>
            <input
              type="text"
              value={formData.deliverTo}
              onChange={(e) =>
                setFormData(prev => ({
                  ...prev,
                  deliverTo: e.target.value,
                }))
              }
              placeholder="أدخل اسم المرسل"
              className={inputClassName}
            />
            {errors.deliverTo && (
              <p className="text-red-500 text-sm mt-1 text-right">
                {errors.deliverTo}
              </p>
            )}
          </div>
        </div>

      )}

      {/* Deposit only for entry type */}
      {initialType === "entry" && (
        <div>
          <input
            type="number"
            name="amount"
            placeholder="المبلغ"
            value={formData.amount}
            onChange={handleChange}
            className={inputClassName}
            autoComplete="off"
          />
        </div>
      )}

      {/* Exit type "من حساب" + "تسليم الى" */}
      {initialType === "exit" && (
        <div className="space-y-4">
          <div>
            <label className={labelClassName}>تسليم الى</label>
            <input
              type="text"
              value={formData.deliverTo}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliverTo: e.target.value,
                }))
              }
              placeholder="أدخل اسم المستلم"
              className={inputClassName}
            />
            {errors.deliverTo && (
              <p className="text-red-500 text-sm mt-1 text-right">
                {errors.deliverTo}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Buy/Sell transactions with Treasury */}
      {(initialType === "sell_to" || initialType === "buy") && (
        <>

          {/* Price */}
          <div>
            <input
              type="number"
              name="price"
              placeholder="القيمة"
              value={formData.price}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.price && (
              <p className="text-red-500 text-sm mt-1 text-right">
                {errors.price}
              </p>
            )}
          </div>

          {/* Rate input */}
          <div>
            <input
              type="number"
              name="rate"
              placeholder="سعر الصرف"
              value={formData.rate || ""}
              onChange={handleChange}
              className={inputClassName}
            />
            {errors.rate && (
              <p className="text-red-500 text-sm mt-1 text-right">
                {errors.rate}
              </p>
            )}
          </div>

          {/* Calculated Amount */}
          <div className="flex gap-2">
            {/* Calculated Amount */}
            <input
              type="text"
              name="amount"
              placeholder="مبلغ"
              value={amount !== "" ? amount : ""}
              readOnly
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600 text-right text-sm"
              style={{ direction: "ltr" }}
            />


            {/* Currency dropdown */}
            <select
              value={selectedCurrency}
              onChange={(e) => setSelectedCurrency(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-600 text-sm"
            >
              {currencies
                .filter((currency) => currency.name !== formData.currency)
                .map((currency) => (
                  <option key={currency.id} value={currency.name}>
                    {currency.name}
                  </option>
                ))}
            </select>


          </div>


        </>
      )}



      {/* Date & Reference */}
      <div className="space-y-2">
        <label className={labelClassName}>التاريخ</label>
        <DatePicker
          selected={
            formData.dateTime ? new Date(formData.dateTime) : new Date()
          }
          onChange={(date: Date | null) => {
            setFormData((prev) => ({
              ...prev,
              dateTime: date
                ? date.toISOString().slice(0, 16)
                : new Date().toISOString().slice(0, 16),
            }));
          }}
          dateFormat="dd/MM/yyyy"
          wrapperClassName="w-full"
          className="w-full h-12 px-4 py-3 border border-gray-300 rounded-xl text-right text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
        {errors.dateTime && (
          <p className="text-red-500 text-sm mt-1 text-right">
            {errors.dateTime}
          </p>
        )}
      </div>

      {/* City / Country Input */}
      <div>
        <label className={labelClassName}>المدينة / البلد</label>
        <input
          type="text"
          name="country_city"
          placeholder="البلد / المدينة"
          value={formData.country_city}
          disabled
          className={inputClassName}
        />
      </div>

      {/* Notes */}
      <div>
        <textarea
          name="notes"
          placeholder="ملاحظة"
          value={formData.notes}
          onChange={handleChange}
          className={`${inputClassName} resize-none`}
          rows={3}
        />
      </div>

      {/* Category Selection */}
      <div className="flex flex-wrap justify-center gap-2 mt-6">
        {Object.keys(categoryTranslations)
          .filter((cat) => {
            if (
              initialType === "sell_to" ||
              initialType === "buy" ||
              initialType === "entry"
            ) {
              return false;
            }
            if (initialType === "exit") {
              return cat === "Withdrawal" || cat === "Transfer";
            }
            return true;
          })
          .map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "primary" : "outline"}
              onClick={() => setSelectedCategory(cat as TransactionCategory)}
              className="flex-1 min-w-[120px] max-w-[150px]"
            >
              {categoryTranslations[cat as keyof typeof categoryTranslations]}
            </Button>
          ))}
      </div>

      {errors.category && (
        <p className="text-red-500 text-sm mt-2 text-center">
          {errors.category}
        </p>
      )}

      {/* Category Step 2 fields */}

      {(selectedCategory === "FX" && formData.fx) ||
        (selectedCategory === "Transfer") ||
        (selectedCategory === "Withdrawal") ? (
        <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-xl">

          {/* FX Category */}
          {selectedCategory === "FX" && formData.fx && (
            <div className="space-y-4">
              <SearchableDropdown
                value={formData.fx.direction}
                onChange={(value) => handleFXChange("direction", value)}
                options={fxDirectionOptions}
                placeholder="ابحث عن نوع العملية"
              />
              ...
            </div>
          )}

          {/* Transfer Category */}
          {selectedCategory === "Transfer" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  name="beneficiary"
                  placeholder="المستفيد"
                  value={formData.beneficiary || ""}
                  onChange={handleChange}
                  className={`${inputClassName} w-full`}
                  autoComplete="off"
                />
                {errors.beneficiary && (
                  <p className="text-red-500 text-sm mt-1 text-right">
                    {errors.beneficiary}
                  </p>
                )}
              </div>
              <div>
                <input
                  type="number"
                  name="amount"
                  placeholder="المبلغ"
                  value={formData.amount || ""}
                  onChange={handleChange}
                  className={`${inputClassName} w-full`}
                  autoComplete="off"
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1 text-right">
                    {errors.amount}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Withdrawal only for exit type */}
          {selectedCategory === "Withdrawal" && (
            <div>
              <input
                type="number"
                name="amount"
                placeholder="المبلغ"
                value={formData.amount}
                onChange={handleChange}
                className={inputClassName}
                autoComplete="off"
              />
            </div>
          )}

        </div>
      ) : null}


    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`إضافة معاملة: ${typeTranslations[initialType]}`}
    >
      <div className="space-y-6">
        {StepContent()}
        <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
          <Button
            variant="primary"
            onClick={handleFinishClick}
            disabled={isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}