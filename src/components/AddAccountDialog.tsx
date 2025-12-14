import React, { useState, useEffect } from "react";
import { Button } from "./ui/Button";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "./ui/Dialog";
import { Plus } from "lucide-react";
import { supabase } from "../lib/supabase";

interface CustomerRow {
    id: number;
    account: string;
    currency: string;
}

interface AddAccountDialogProps {
    customerName: string;
}

export const AddAccountDialog: React.FC<AddAccountDialogProps> = ({ customerName }) => {
    const [open, setOpen] = useState(false);
    const [inputAccount, setInputAccount] = useState("");
    const [inputCurrency, setInputCurrency] = useState("");
    const [customerRows, setCustomerRows] = useState<CustomerRow[]>([]);
    const [allAccounts, setAllAccounts] = useState<string[]>([]);
    const [allCurrencies, setAllCurrencies] = useState<string[]>([]);

    // Fetch rows for this customer
    useEffect(() => {
        if (!open) return;

        const fetchCustomerAccounts = async () => {
            const { data, error } = await supabase
                .from("customers_accounts")
                .select("id, account, currency")
                .eq("customer", customerName) as { data: { id: number; account: string; currency: string }[] | null, error: any };


            if (error) {
                console.error(error);
                return;
            }

            if (data) {
                setCustomerRows(
                    data.map((row) => ({
                        id: row.id,
                        account: row.account || "",
                        currency: row.currency || "",
                    }))
                );
            }
        };

        const fetchReferenceData = async () => {
            const { data: accountsData } = await supabase.from("treasury_categories").select("name");
            if (accountsData) setAllAccounts(accountsData.map((a: any) => a.name));

            const { data: currenciesData } = await supabase.from("currencies").select("name");
            if (currenciesData) setAllCurrencies(currenciesData.map((c: any) => c.name));
        };

        fetchCustomerAccounts();
        fetchReferenceData();
    }, [open, customerName]);

    const handleSubmit = async () => {
        if (!inputAccount && !inputCurrency) {
            alert("يرجى إدخال الحساب أو العملة أو كلاهما");
            return;
        }

        const { data, error } = await supabase
            .from("customers_accounts")
            .insert
            ([
                {
                    customer: customerName,
                    account: inputAccount || null,
                    currency: inputCurrency || null,
                },
            ])
            .select("id, account, currency");

        if (error) {
            if (error.code === "23505") {
                alert("هذا الحساب أو العملة موجودة مسبقاً");
            } else {
                alert("حدث خطأ أثناء الإضافة");
                console.error(error);
            }
            return;
        }

        if (data && data[0]) {
            setCustomerRows((prev) => [...prev, data[0]]);
        }

        setInputAccount("");
        setInputCurrency("");
        alert("تمت الإضافة بنجاح!");
    };

    const handleDelete = async (id: number) => {
        if (!confirm("هل أنت متأكد من الحذف؟")) return;

        console.log("Attempting to delete row with id:", id);

        const { data, error } = await supabase
            .from("customers_accounts")
            .delete()
            .eq("id", id)
            .select();

        if (error) {
            console.error("Supabase delete error:", error);
            alert("حدث خطأ أثناء الحذف");
            return;
        }

        console.log("Delete result:", data);

        if (data && data.length > 0) {
            setCustomerRows(prev => prev.filter(r => r.id !== id));
            alert("تم الحذف بنجاح!");
        } else {
            alert("لم يتم حذف أي صف");
        }
    };


    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                icon={Plus}
                onClick={() => setOpen(true)}
                className="flex items-center gap-2"
            >
                إضافة حساب / عملة
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl w-full">
                    <DialogClose />
                    <DialogTitle className="text-center text-lg font-semibold mb-4">
                        إضافة حساب / عملة
                    </DialogTitle>
                    <br />
                    <p className="text-lg font-bold text-[#212E5B]">
                        الحسابات و العملات المتاحة للعميل {customerName}:
                    </p>

                    <br />

                    {/* Existing rows */}
                    {customerRows.length > 0 ? (
                        <ul className="space-y-2 mb-4">
                            {customerRows.map((row) => (
                                <li
                                    key={row.id}
                                    className="border-b py-1"
                                >
                                    <div className="flex items-center justify-between">

                                        <div className="flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-full bg-[#212E5B]"></span>
                                            <span className="text-right">
                                                الحساب: {row.account} , العملة: {row.currency}
                                            </span>
                                        </div>
                                        <button
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => handleDelete(row.id)}
                                        >
                                            حذف
                                        </button>

                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mb-4">لا يوجد حسابات أو عملات حالياً</p>
                    )}


                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="block mb-1">اختر حساب:</label>
                            <select
                                value={inputAccount}
                                onChange={(e) => setInputAccount(e.target.value)}
                                className="border p-2 rounded w-full text-right"
                            >
                                <option value="">-- اختر حساب --</option>
                                {allAccounts.map((acc) => (
                                    <option key={acc} value={acc}>
                                        {acc}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-1">اختر عملة:</label>
                            <select
                                value={inputCurrency}
                                onChange={(e) => setInputCurrency(e.target.value)}
                                className="border p-2 rounded w-full text-right"
                            >
                                <option value="">-- اختر عملة --</option>
                                {allCurrencies.map((cur) => (
                                    <option key={cur} value={cur}>
                                        {cur}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="mt-4 flex justify-end gap-2">
                        <Button onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button onClick={handleSubmit}>حفظ</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
