import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Home, LogOut, Edit, Save, Trash2, Plus, X, CheckCircle } from "lucide-react";
import { useLockBodyScroll } from "../hooks/useLockBodyScroll";
import { Dialog, DialogContent, DialogTitle } from "./ui/Dialog";

type Account = {
    id: string;
    name: string;
    category: string;
    supported_currencies: string[] | null;
    active: boolean;
    created_at: string;
};

type TreasuryCategory = { id: string; name: string };
type Currency = { id: string; name: string; code: string; symbol?: string };

type MultiSelectProps = {
    options: Currency[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
};

export function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
    const [open, setOpen] = useState(false);

    const toggleOption = (symbol: string) => {
        if (selected.includes(symbol)) {
            onChange(selected.filter((s) => s !== symbol));
        } else {
            onChange([...selected, symbol]);
        }
    };



    return (
        <div className="relative text-right">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="border rounded px-3 py-2 w-full text-right bg-white"
            >
                {selected.length > 0 ? selected.join("، ") : placeholder || "اختر العملات"}
            </button>
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow max-h-60 overflow-y-auto">
                    {options.map((opt) => (
                        <label key={opt.id} className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selected.includes(opt.name)}
                                onChange={() => toggleOption(opt.name)}
                                className="ml-2"
                            />
                            {opt.name}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function AccountsList() {
    const { user, signOut } = useAuth();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Account>>({});
    const [saving, setSaving] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false); // Treasury modal
    const [showCurrencyModal, setShowCurrencyModal] = useState(false); // Currency modal
    const [newAccount, setNewAccount] = useState<Partial<Account>>({
        name: "",
        category: "",
        supported_currencies: [],
    });
    const [adding, setAdding] = useState(false); // For treasury modal
    const [newCurrency, setNewCurrency] = useState({ name: "", code: "", symbol: "" }); // Currency modal data
    const [addingCurrency, setAddingCurrency] = useState(false); // For currency modal

    // Lock body scroll when either modal is open
    useLockBodyScroll(showAddModal || showCurrencyModal);


    const [categories, setCategories] = useState<TreasuryCategory[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);



    useEffect(() => {
        fetchAccounts();
        fetchCategories();
        fetchCurrencies();
    }, []);
    ;

    const fetchAccounts = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("accounts").select("*").order("created_at", { ascending: false });
        if (error) console.error("Error fetching accounts:", error);
        else setAccounts(data || []);
        setLoading(false);
    };

    const fetchCategories = async () => {
        const { data, error } = await supabase.from("treasury_categories").select("*");
        if (error) console.error("Error fetching categories:", error);
        else setCategories(data || []);
    };

    const fetchCurrencies = async () => {
        const { data, error } = await supabase.from("currencies").select("id, name, code");
        if (error) console.error("Error fetching currencies:", error);
        else setCurrencies(data || []);
    };

    const handleEdit = (acc: Account) => {
        setEditingId(acc.id);
        setEditData({ ...acc, supported_currencies: acc.supported_currencies || [] });
    };

    const handleChange = <K extends keyof Account>(field: K, value: Account[K]) => {
        setEditData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!editingId) return;
        setSaving(true);

        try {
            // 1️Update the account info 
            const { error: accountError } = await supabase
                .from("accounts")
                .update({
                    category: editData.category ?? "",
                    supported_currencies: editData.supported_currencies ?? []
                })
                .eq("id", editingId);

            if (accountError) throw accountError;

            // 2️Fetch account name
            const { data: accountData, error: accountFetchError } = await supabase
                .from("accounts")
                .select("name")
                .eq("id", editingId)
                .single();

            if (accountFetchError) throw accountFetchError;
            const accountName = accountData.name;

            const { data: existingCurrenciesData, error: existingCurrenciesError } = await supabase
                .from("account_currencies")
                .select("currency")
                .eq("account", accountName);

            if (existingCurrenciesError) throw existingCurrenciesError;

            //  Normalize existing currencies and edited currencies
            const existingCurrencies = (existingCurrenciesData?.map(c => c.currency.trim().toUpperCase()) || []);
            const updatedCurrenciesNormalized = Array.from(
                new Set((editData.supported_currencies ?? []).map(c => c.trim().toUpperCase()))
            );


            const newCurrencies = updatedCurrenciesNormalized.filter(c => !existingCurrencies.includes(c));

            if (newCurrencies.length > 0) {
                const currenciesToInsert = newCurrencies.map(code => ({
                    account: accountName,
                    currency: code,
                }));

                const { error: insertError } = await supabase
                    .from("account_currencies")
                    .upsert(currenciesToInsert, {
                        onConflict: "account,currency",
                    });


                if (insertError) console.error("Error inserting currencies:", insertError);
                else console.log("Inserted new currencies:", newCurrencies);
            }
            const currenciesToRemove = existingCurrencies.filter(
                c => !updatedCurrenciesNormalized.includes(c)
            );

            if (currenciesToRemove.length > 0) {
                const { data, error } = await supabase
                    .from("account_currencies")
                    .delete()
                    .eq("account", accountName)
                    .in("currency", currenciesToRemove);

                if (error) {
                    console.error("Error removing currencies:", error);
                } else {
                    console.log("Removed unchecked currencies:", data);
                }
            } else {
                console.log("No currencies to remove.");
            }


            setEditingId(null);
            setEditData({});
            fetchAccounts();

        } catch (err) {
            console.error("Error updating account:", err);
            alert("فشل تحديث الخزينة. تحقق من الكونسول.");
        } finally {
            setSaving(false);
        }
    };



    const handleDeleteAccount = async (accountName: string) => {
        if (!window.confirm("هل أنت متأكد من حذف هذه الخزينة وجميع العملات الخاصة بها؟")) return;

        try {
            // 1️⃣ Delete from account_currencies first
            const { error: currencyError } = await supabase
                .from("account_currencies")
                .delete()
                .eq("account", accountName);

            if (currencyError) throw currencyError;

            // 2️⃣ Delete the account itself
            const { error: accountError } = await supabase
                .from("accounts")
                .delete()
                .eq("name", accountName);

            if (accountError) throw accountError;

            alert("✅ تم حذف الخزينة وجميع العملات الخاصة بها بنجاح.");

            setAccounts((prev) => prev.filter((acc) => acc.name !== accountName));

        } catch (err) {
            console.error("❌ فشل حذف الخزينة:", err);
            alert("فشل الحذف، حاول مرة أخرى.");
        }
    };



    // Add a new treasury/account
    const handleAddAccount = async () => {
        setAdding(true);

        try {
            // Validate input
            if (!newAccount.name || !newAccount.category) {
                alert("يرجى إدخال اسم الخزينة والموقع");
                setAdding(false);
                return;
            }

            // Check if account already exists
            const { data: existingAccounts, error: existingError } = await supabase
                .from("accounts")
                .select("*")
                .eq("name", newAccount.name);

            if (existingError) throw existingError;

            if (existingAccounts?.length) {
                alert("هذه الخزينة موجودة مسبقًا!");
                setAdding(false);
                return;
            }

            // Insert account
            const { error: insertError } = await supabase.from("accounts").insert([
                {
                    name: newAccount.name,
                    category: newAccount.category,
                    supported_currencies: newAccount.supported_currencies ?? [],
                    active: true,
                },
            ]);

            if (insertError) throw insertError;

            // Insert associated currencies if any
            if (newAccount.supported_currencies?.length) {
                const validCurrencies = await supabase
                    .from("currencies")
                    .select("name")
                    .in("name", newAccount.supported_currencies);

                const currenciesToInsert =
                    validCurrencies.data?.map((c) => ({
                        account: newAccount.name,
                        currency: c.name,
                    })) || [];

                if (currenciesToInsert.length) {
                    const { error: currencyInsertError } = await supabase
                        .from("account_currencies")
                        .insert(currenciesToInsert);
                    if (currencyInsertError) console.error(currencyInsertError);
                }
            }

            // Reset state and show success dialog
            setNewAccount({ name: "", category: "", supported_currencies: [] });
            setShowAddModal(false);
            setSuccessOpen(true);
            fetchAccounts();
        } catch (err) {
            console.error(err);
            alert("فشل إضافة الخزينة. تحقق من الكونسول.");
        } finally {
            setAdding(false);
        }
    };

    // Add a new currency
    const handleAddCurrency = async () => {
        setAddingCurrency(true);

        try {
            // Validate input
            if (!newCurrency.name || !newCurrency.code) {
                alert("يرجى إدخال اسم العملة ورمزها");
                setAddingCurrency(false);
                return;
            }

            // Check if currency exists
            const { data: existing, error: checkError } = await supabase
                .from("currencies")
                .select("*")
                .eq("code", newCurrency.code);

            if (checkError) throw checkError;
            if (existing?.length) {
                alert("هذه العملة موجودة مسبقًا!");
                setAddingCurrency(false);
                return;
            }

            // Insert new currency
            const { error: insertError } = await supabase.from("currencies").insert([
                {
                    name: newCurrency.name,
                    code: newCurrency.code.toUpperCase(),
                    symbol: newCurrency.symbol,
                },
            ]);

            if (insertError) throw insertError;

            // Reset state and show success dialog
            setNewCurrency({ name: "", code: "", symbol: "" });
            setShowCurrencyModal(false);
            setSuccessOpen(true);
            fetchCurrencies();
        } catch (err) {
            console.error(err);
            alert("فشل في إضافة العملة");
        } finally {
            setAddingCurrency(false);
        }
    };



    const filteredAccounts = accounts.filter((acc) =>
        acc.name.toLowerCase().includes(search.toLowerCase())
    );



    const [successOpen, setSuccessOpen] = useState(false);


    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50" dir="rtl">
            {/* Header */}
            <motion.header initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20">
                <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <Link to="/" className="flex-shrink-0">
                            <img src="/applogo.png" alt="App Logo" className="w-20 h-20 sm:w-28 sm:h-28 object-contain" />
                        </Link>
                        <div className="text-center sm:text-right">
                            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">نظام المعاملات المالية</h1>
                            <p className="text-xs sm:text-sm text-gray-600">مرحباً، {user?.email ?? ""}</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Link to="/" className="w-full sm:w-auto">
                            <Button style={{ background: "linear-gradient(to right, #212E5B, #4B5472)" }} className="flex items-center justify-center gap-2 py-2 sm:py-3 text-xs sm:text-sm w-full sm:w-auto">
                                <Home className="w-4 h-4" /> <span>الرئيسية</span>
                            </Button>
                        </Link>
                        <Button variant="outline" onClick={signOut} className="flex items-center justify-center gap-2 py-2 sm:py-3 text-xs sm:text-sm w-full sm:w-auto">
                            <LogOut className="w-4 h-4" /> <span>تسجيل الخروج</span>
                        </Button>
                    </div>
                </div>
            </motion.header>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 mt-4 sm:mt-6">

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-800 pl-3">
                            قائمة الخزائن
                        </h1>
                        <div className="flex gap-3 pl-3">
                            <Button
                                onClick={() => setShowAddModal(true)}
                                style={{ background: "linear-gradient(to right, #212E5B, #4B5472)" }}
                                className="flex items-center justify-center gap-2 py-2 sm:py-3 text-xs sm:text-sm"
                            >
                                <Plus size={16} /> إضافة خزينة
                            </Button>

                            <Button
                                onClick={() => setShowCurrencyModal(true)}
                                style={{ background: "linear-gradient(to right, #4B5472, #6C789F)" }}
                                className="flex items-center justify-center gap-2 py-2 sm:py-3 text-xs sm:text-sm"
                            >
                                <Plus size={16} /> إضافة عملة
                            </Button>
                        </div>


                    </div>

                    {/* Search */}
                    <div className="max-w-xs w-full relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-base sm:text-lg">🔍</span>
                        <input
                            type="text"
                            placeholder="ابحث عن الخزينة"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-white shadow rounded-lg border border-gray-300 focus:outline-none focus:border-[#212E5B] focus:ring-2 focus:ring-[#868EAA] px-10 py-2 text-gray-800 text-sm sm:text-base text-right"
                        />
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#212E5B] mx-auto"></div>
                        <p className="text-gray-600 mt-2 text-sm sm:text-base">جاري التحميل...</p>
                    </div>
                ) : filteredAccounts.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-gray-500 text-sm sm:text-base">لا توجد حسابات مطابقة للفلاتر.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full border border-gray-300 text-sm hidden sm:table">
                            <thead className="bg-[#212E5B] text-white">
                                <tr>
                                    <th className="border p-3 text-center">اسم الخزينة</th>
                                    <th className="border p-3 text-center">الموقع</th>
                                    <th className="border p-3 text-center">العملات المدعومة</th>
                                    <th className="border p-3 text-center">إجراء</th>
                                </tr>
                            </thead>


                            <tbody>
                                {filteredAccounts.map((acc) => (
                                    <tr key={acc.id} className="hover:bg-gray-100 transition">
                                        <td className="border p-3 text-center">
                                            {editingId === acc.id ? (
                                                <input className="border rounded px-2 py-1 w-full" value={editData.name ?? ""} onChange={(e) => handleChange("name", e.target.value)} />
                                            ) : (
                                                acc.name
                                            )}
                                        </td>

                                        <td className="border p-3 text-center">
                                            {editingId === acc.id ? (
                                                <select
                                                    className="border rounded px-2 py-1 w-full text-right"
                                                    value={editData.category ?? ""}
                                                    onChange={(e) => handleChange("category", e.target.value)}
                                                >
                                                    <option value="">اختر الموقع</option>
                                                    {categories.map((cat) => (
                                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                acc.category
                                            )}
                                        </td>

                                        <td className="border p-3 text-center">
                                            {editingId === acc.id ? (
                                                <MultiSelect
                                                    options={currencies}
                                                    selected={editData.supported_currencies ?? []}
                                                    onChange={(val) => handleChange("supported_currencies", val)}
                                                    placeholder="اختر العملات"
                                                />
                                            ) : acc.supported_currencies?.length ? (
                                                acc.supported_currencies
                                                    .map((c) => {
                                                        const found = currencies.find(
                                                            (cur) => cur.code === c || cur.name === c
                                                        );
                                                        return found ? found.name : c;
                                                    })
                                                    .join("، ")
                                            ) : (
                                                "-"
                                            )}
                                        </td>


                                        <td className="border p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                {editingId === acc.id ? (
                                                    <>
                                                        <Button onClick={handleSave} disabled={saving} style={{ background: "linear-gradient(to right, #212E5B, #4B5472)" }} className="flex items-center justify-center gap-1">
                                                            <Save size={16} /> {saving ? "جاري الحفظ..." : "حفظ"}
                                                        </Button>
                                                        <Button variant="outline" onClick={() => { setEditingId(null); setEditData({}); }} className="flex items-center justify-center gap-1">إلغاء</Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button variant="outline" onClick={() => handleEdit(acc)} className="flex items-center justify-center gap-1"><Edit size={16} /> تعديل</Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => handleDeleteAccount(acc.name)}
                                                            className="flex items-center justify-center gap-1 border-red-500 text-red-500 hover:bg-red-50"
                                                        >
                                                            <Trash2 size={16} /> حذف
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                        </table>
                    </div>
                )}

                {/* Account Count */}
                {!loading && filteredAccounts.length > 0 && (
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-600">
                            عرض {filteredAccounts.length} من أصل {accounts.length} خزينة
                        </p>
                    </div>
                )}
            </div>


            {/* Add Modal خزينة */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div
                        className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative max-h-[90vh]"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            إضافة خزينة جديدة
                        </h2>

                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="اسم الخزينة"
                                className="border rounded px-3 py-2 text-right"
                                value={newAccount.name}
                                onChange={(e) =>
                                    setNewAccount({ ...newAccount, name: e.target.value })
                                }
                            />

                            <select
                                className="border rounded px-3 py-2 text-right"
                                value={newAccount.category ?? ""}
                                onChange={(e) =>
                                    setNewAccount({ ...newAccount, category: e.target.value })
                                }
                            >
                                <option value="">اختر الموقع</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.name}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>

                            <MultiSelect
                                options={currencies}
                                selected={newAccount.supported_currencies ?? []}
                                onChange={(val) =>
                                    setNewAccount({ ...newAccount, supported_currencies: val })
                                }
                                placeholder="اختر العملات"
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <Button variant="outline" onClick={() => setShowAddModal(false)}>
                                إلغاء
                            </Button>
                            <Button
                                onClick={handleAddAccount}
                                disabled={adding}
                                style={{ background: "linear-gradient(to right, #212E5B, #4B5472)" }}
                            >
                                {adding ? "جاري الإضافة..." : "إضافة"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}



            {/* Add Currency Modal */}
            {showCurrencyModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-hidden">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg relative max-h-[90vh] overflow-y-hidden">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowCurrencyModal(false)}
                            className="absolute top-3 left-3 text-gray-500 hover:text-gray-700"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            إضافة عملة جديدة
                        </h2>

                        <div className="flex flex-col gap-3">
                            <input
                                type="text"
                                placeholder="اسم العملة (مثلاً: الدينار الليبي)"
                                className="border rounded px-3 py-2 text-right"
                                value={newCurrency.name}
                                onChange={(e) =>
                                    setNewCurrency({ ...newCurrency, name: e.target.value })
                                }
                            />

                            <input
                                type="text"
                                placeholder="رمز العملة (مثلاً: LYD)"
                                className="border rounded px-3 py-2 text-right uppercase"
                                value={newCurrency.code}
                                onChange={(e) =>
                                    setNewCurrency({ ...newCurrency, code: e.target.value.toUpperCase() })
                                }
                            />

                            <input
                                type="text"
                                placeholder="رمز مختصر (مثلاً: $)"
                                className="border rounded px-3 py-2 text-right"
                                value={newCurrency.symbol}
                                onChange={(e) =>
                                    setNewCurrency({ ...newCurrency, symbol: e.target.value })
                                }
                            />
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowCurrencyModal(false)}
                            >
                                إلغاء
                            </Button>
                            <Button
                                onClick={handleAddCurrency}
                                disabled={addingCurrency}
                                style={{ background: "linear-gradient(to right, #4B5472, #6C789F)" }}
                            >
                                {addingCurrency ? "جاري الإضافة..." : "إضافة"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Dialog */}
            <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
                <DialogContent className="w-[500px] max-w-full p-8 bg-white rounded-xl shadow-lg flex flex-col items-center gap-3">
                    <DialogTitle className="sr-only">نجاح العملية</DialogTitle>
                    <CheckCircle className="w-12 h-12 text-green-500" />
                    <p className="text-green-600 font-semibold text-lg">تم الحفظ بنجاح</p>
                </DialogContent>
            </Dialog>


        </div>
    );
}
