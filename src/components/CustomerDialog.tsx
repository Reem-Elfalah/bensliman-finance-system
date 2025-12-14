import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/Button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "../components/ui/Dialog";
import { Plus, Users, CheckCircle } from "lucide-react";

// Add the prop interface
interface CustomerDialogProps {
  onCustomerAdded?: () => void;
  className?: string;
}

export const CustomerDialog = ({ onCustomerAdded }: CustomerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSaveCustomer = async () => {
    setErrorMessage(""); // reset error

    if (!customerName) {
      setErrorMessage("الرجاء إدخال اسم العميل");
      return;
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("البريد الإلكتروني غير صحيح");
      return;
    }

    // ✅ Check if phone already exists only if phone is provided
    if (phone) {
      const { data: existing, error: checkError } = await supabase
        .from("customers")
        .select("id, phones")
        .contains("phones", [phone]);

      if (checkError) {
        setErrorMessage("حدث خطأ أثناء التحقق من رقم الهاتف");
        return;
      }

      if (existing && existing.length > 0) {
        setErrorMessage("رقم الهاتف مستخدم بالفعل");
        return;
      }
    }

    // If no duplicate → insert
    const { error } = await supabase.from("customers").insert([
      {
        name: customerName,
        phones: phone ? [phone] : [], // Only add phone if provided
        email: email || null, // Save email (null if empty)
        enabled_currencies: ["LYD"],
        status: "active",
      },
    ] as any);

    if (error) {
      setErrorMessage("تعذر حفظ العميل");
      return;
    }

    // Clear inputs
    setCustomerName("");
    setPhone("");
    setEmail("");
    setOpen(false); // close main dialog

    // CALL THE REFRESH FUNCTION HERE
    if (onCustomerAdded) {
      onCustomerAdded();
    }

    // Open success dialog
    setSuccessOpen(true);

    // Auto close after 1.5s
    setTimeout(() => {
      setSuccessOpen(false);
    }, 1500);
  };

  return (
    <>
      {/* Main Customer Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="primary"
            size="lg"
            icon={Plus}
            className="flex items-center gap-2 px-4 sm:px-6 py-3 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all w-full sm:w-auto text-sm sm:text-base"
          >
            إضافة حساب عميل
          </Button>
        </DialogTrigger>

        <DialogContent className="z-[10000] w-[95vw] sm:w-[500px] max-w-full p-4 sm:p-6 md:p-8 bg-white rounded-xl shadow-xl mx-auto">
          <div className="flex flex-col items-center mb-4 sm:mb-6">
            <div
              className="bg-blue-100
 p-3 sm:p-4 rounded-full mb-2 sm:mb-3"
            >
              <Users className="text-[#212E5B] w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <DialogTitle className="text-center text-xl sm:text-2xl font-bold font-sans">
              إضافة حساب عميل جديد
            </DialogTitle>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 text-right">
            <div>
              <input
                type="text"
                placeholder="اسم العميل"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="border border-gray-300 focus:border-[#212E5B] p-3 rounded-lg w-full text-right placeholder:text-gray-400 focus:ring-2 focus:ring-[#212E5B] focus:outline-none transition-colors text-sm sm:text-base"
              />
            </div>

            <div>
              <input
                type="tel"
                placeholder="الهاتف (اختياري)"
                value={phone}
                onChange={(e) => {
                  const numericValue = e.target.value.replace(/\D/g, "");
                  setPhone(numericValue);
                }}
                className="border border-gray-300 focus:border-[#212E5B] p-3 rounded-lg w-full text-right placeholder:text-gray-400 focus:ring-2 focus:ring-[#212E5B] focus:outline-none transition-colors text-sm sm:text-base"
              />
            </div>

            <div>
              <input
                type="email"
                placeholder="البريد الإلكتروني (اختياري)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border border-gray-300 focus:border-[#212E5B] p-3 rounded-lg w-full text-left placeholder:text-right placeholder:text-gray-400 focus:ring-2 focus:ring-[#212E5B] focus:outline-none transition-colors text-sm sm:text-base"
              />
            </div>

            {errorMessage && (
              <p className="text-red-500 text-sm text-right">{errorMessage}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              onClick={handleSaveCustomer}
              className="mt-2 w-full py-3 text-sm sm:text-base"
            >
              حفظ العميل
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="w-[95vw] sm:w-[500px] max-w-full p-6 sm:p-8 bg-white rounded-xl shadow-lg flex flex-col items-center gap-3">
          <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-500" />
          <p className="text-green-600 font-semibold text-base sm:text-lg">
            تم الحفظ بنجاح
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};
