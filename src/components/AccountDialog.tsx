import React, { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/Button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "../components/ui/Dialog";
import { Plus, CreditCard, ChevronDown, CheckCircle } from "lucide-react";

interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
}

interface TreasuryCategory {
  id: string;
  name: string;
}

export const AccountDialog = () => {
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [category, setCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dynamic options from database
  const [currencyOptions, setCurrencyOptions] = useState<Currency[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<TreasuryCategory[]>(
    []
  );

  // Fetch currencies from database
  const fetchCurrencies = async () => {
    try {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching currencies:", error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error("Error fetching currencies:", error);
      return [];
    }
  };

  // Fetch categories from database
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("treasury_categories")
        .select("*")
        .order("name");

      if (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  };

  // Fetch data when dialog opens
  useEffect(() => {
    const fetchOptions = async () => {
      if (open) {
        setLoading(true);
        try {
          const [currenciesData, categoriesData] = await Promise.all([
            fetchCurrencies(),
            fetchCategories(),
          ]);

          setCurrencyOptions(currenciesData);
          setCategoryOptions(categoriesData);
        } catch (error) {
          console.error("Error fetching options:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchOptions();
  }, [open]);

  const toggleCurrency = (currencyName: string) => {
    setCurrencies((prev) =>
      prev.includes(currencyName)
        ? prev.filter((c) => c !== currencyName)
        : [...prev, currencyName]
    );
  };

  const handleSaveAccount = async () => {
    if (!accountName || !category) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    // Find the selected category name
    const selectedCategory = categoryOptions.find((cat) => cat.id === category);

    if (!selectedCategory) {
      alert("يرجى اختيار فئة صحيحة");
      return;
    }

    const { error } = await supabase.from("accounts").insert([
      {
        name: accountName,
        treasury_category_id: category, // Store the category ID
        supported_currencies: currencies.length ? currencies : ["دينار"],
        active: true,
      },
    ]);

    if (error) {
      console.error("Error saving account:", error);
      alert(`خطأ في حفظ الحساب: ${error.message}`);
      return;
    }

    // Reset form
    setAccountName("");
    setCategory("");
    setCurrencies([]);
    setCategoryOpen(false);
    setCurrencyOpen(false);
    setOpen(false);

    // Show success dialog
    setSuccessOpen(true);
    setTimeout(() => setSuccessOpen(false), 1500);
  };

  const categoryRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target as Node)
      ) {
        setCategoryOpen(false);
      }
      if (
        currencyRef.current &&
        !currencyRef.current.contains(event.target as Node)
      ) {
        setCurrencyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get display name for selected category
  const getSelectedCategoryName = () => {
    if (!category) return "اختر الفئة";
    const selectedCat = categoryOptions.find((opt) => opt.id === category);
    return selectedCat ? selectedCat.name : "اختر الفئة";
  };

  // Get display for selected currencies
  const getSelectedCurrenciesDisplay = () => {
    if (currencies.length === 0) return "اختر العملات المدعومة";

    return currencies.join("، ");
  };

  return (
    <>
      {/* Main Account Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="primary"
            size="lg"
            icon={Plus}
            className="flex items-center gap-2 px-6 py-3 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
          >
            اضافة حساب خزينة
          </Button>
        </DialogTrigger>

        <DialogContent className="w-[500px] max-w-full p-8 bg-white rounded-xl shadow-xl">
          {/* Card-style header */}
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-100 p-4 rounded-full mb-3">
              <CreditCard className="text-[#212E5B] w-8 h-8" />
            </div>
            <DialogTitle
              className="text-center text-2xl font-bold font-sans"
              style={{ fontFamily: "'Tajawal', sans-serif" }}
            >
              إضافة حساب خزينة جديد
            </DialogTitle>
          </div>

          <div className="flex flex-col gap-4 mt-2 text-right">
            {/* Account Name */}
            <input
              type="text"
              placeholder="اسم الحساب"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="border border-gray-300 focus:border-[#212E5B] p-3 rounded-lg w-full text-right placeholder:text-gray-400 focus:ring-2 focus:ring-[#212E5B] focus:outline-none transition-colors"
            />

            {/* Category Dropdown */}
            <div className="relative" ref={categoryRef}>
              <div
                className="border rounded-lg p-3 w-full cursor-pointer text-gray-700 flex justify-between items-center hover:border-gray-400 transition-colors"
                onClick={() => setCategoryOpen(!categoryOpen)}
              >
                <span>
                  {loading ? "جاري التحميل..." : getSelectedCategoryName()}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </div>

              {categoryOpen && !loading && (
                <div className="absolute z-10 mt-1 bg-white border rounded-lg shadow-lg w-full max-h-40 overflow-y-auto">
                  {categoryOptions.length > 0 ? (
                    categoryOptions.map((opt) => (
                      <div
                        key={opt.id}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-right transition-colors"
                        onClick={() => {
                          setCategory(opt.id);
                          setCategoryOpen(false);
                        }}
                      >
                        {opt.name}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-right">
                      لا توجد فئات متاحة
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Multi-select currencies */}
            <div className="relative" ref={currencyRef}>
              <div
                className="border rounded-lg p-3 w-full cursor-pointer text-gray-700 flex justify-between items-center hover:border-gray-400 transition-colors"
                onClick={() => setCurrencyOpen(!currencyOpen)}
              >
                <span>
                  {loading ? "جاري التحميل..." : getSelectedCurrenciesDisplay()}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </div>

              {currencyOpen && !loading && (
                <div className="absolute z-10 mt-1 bg-white border rounded-lg shadow-lg w-full max-h-40 overflow-y-auto">
                  {currencyOptions.length > 0 ? (
                    currencyOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-100 cursor-pointer text-right transition-colors"
                      >
                        <span>
                          {opt.name} {opt.symbol && `(${opt.symbol})`}
                        </span>
                        <input
                          type="checkbox"
                          checked={currencies.includes(opt.name)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleCurrency(opt.name)}
                          className="w-4 h-4 text-[#212E5B] focus:ring-[#212E5B] border-gray-300 rounded"
                        />
                      </label>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-right">
                      لا توجد عملات متاحة
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleSaveAccount}
              disabled={loading || !accountName || !category}
              className="mt-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "جاري الحفظ..." : "حفظ الحساب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="w-[500px] max-w-full p-8 bg-white rounded-xl shadow-lg flex flex-col items-center gap-3">
          <CheckCircle className="w-12 h-12 text-green-500" />
          <p className="text-green-600 font-semibold text-lg">تم الحفظ بنجاح</p>
        </DialogContent>
      </Dialog>
    </>
  );
};
