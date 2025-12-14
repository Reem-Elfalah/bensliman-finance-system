import React from "react";
import { supabase } from "../../lib/supabase";
import { useForm } from "react-hook-form";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { useAuth } from "../../hooks/useAuth";

export type TransactionType = "exit" | "sell_to" | "buy" | "entry";

export interface TransactionFormData {
  name: string;
  from_account: string;
  to_account: string;
  deliver_to: string;
  amount: number;
  price: number;
  country_city: string;
  paper_category: string;
  currency: string;
  notes: string;
  Treasury: string;
}

const typeLabels: Record<TransactionType, string> = {
  exit: "خروج",
  sell_to: "بيع الى",
  buy: "شراء من",
  entry: "دخول",
};

const currencyOptions = [
  "دينار الليبي",
  "دينار التونسي",
  "دينار ليبي فئة (20-5)",
  "جني المصري",
  "ريممبي الصين",
  "دولار",
  "يورو",
  "جني المصري",
  "غرام ذهب",
  "غرام فضة",
];

// Add Treasury options here
const TreasuryOptions = [
  "بنوك ليبيا",
  "دبي",
  "تركيا",
  "بنغازي",
  "مصراتة",
  "الزاوية",
];

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  type: TransactionType;
  onChange?: (data: TransactionFormData) => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  type,
  onChange,
}) => {
  const { user } = useAuth();
  const {
    register,
    reset,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    mode: "onChange",
    defaultValues: {
      name: "",
      from_account: "",
      to_account: "",
      deliver_to: "",
      amount: 0,
      price: 0,
      country_city: "",
      paper_category: "غير محدد",
      currency: "دولار",
      notes: "",
      Treasury: "",
    },
  });

  // Submit handler to save transaction to Supabase with dynamic user data
  const onSubmit = async (data: TransactionFormData) => {
    if (!user) {
      alert("يجب تسجيل الدخول أولاً");
      return;
    }

    // Prepare payload with dynamic user data
    const payload = {
      ...data,
      user_id: user.id,
      user_email: user.email,
      type,
      Treasury: data.Treasury || null,
      created_at: new Date().toISOString(),
    };

    console.log("Transaction payload:", payload);
    console.log("Treasury value being saved:", payload.Treasury);

    const { data: result, error } = await supabase
      .from("transactions")
      .insert([payload])
      .select();

    if (error) {
      console.error("Supabase error:", error);
      alert("فشل حفظ المعاملة: " + error.message);
      return;
    }

    console.log("Successfully saved transaction:", result);
    reset();
    onClose();
  };

  const watchedData = watch();
  React.useEffect(() => {
    if (onChange) onChange(watchedData);
  }, [watchedData, onChange]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`إضافة معاملة ${typeLabels[type]}`}
      size="lg"
    >
      <form
        className="space-y-4 sm:space-y-6"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* User Info Display */}
        {user && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">المستخدم:</span>
              <span className="font-medium text-gray-900">{user.email}</span>
            </div>
          </div>
        )}

        {/* Conditional fields based on transaction type */}
        <div className="space-y-4">
          {(type === "sell_to" || type === "buy") && (
            <Input
              label="الأسم"
              {...register("name", {
                required:
                  type === "sell_to" || type === "buy"
                    ? "حقل الاسم مطلوب"
                    : false,
              })}
              error={errors.name?.message}
              className="text-sm sm:text-base"
            />
          )}

          {type === "exit" && (
            <Input
              label="من حساب"
              {...register("from_account", {
                required: type === "exit" ? "حقل من حساب مطلوب" : false,
              })}
              error={errors.from_account?.message}
              className="text-sm sm:text-base"
            />
          )}

          {type === "entry" && (
            <Input
              label="في حساب"
              {...register("to_account", {
                required: type === "entry" ? "حقل في حساب مطلوب" : false,
              })}
              error={errors.to_account?.message}
              className="text-sm sm:text-base"
            />
          )}

          {(type === "exit" || type === "entry") && (
            <Input
              label={type === "entry" ? "استلمت من" : "تسليم الى"}
              {...register("deliver_to", {
                required:
                  type === "exit" || type === "entry"
                    ? "هذا الحقل مطلوب"
                    : false,
              })}
              error={errors.deliver_to?.message}
              className="text-sm sm:text-base"
            />
          )}
        </div>

        {/* Amount and Price in responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="المبلغ"
            type="number"
            step="0.01"
            min="0.01"
            {...register("amount", {
              required: "حقل المبلغ مطلوب",
              min: { value: 0.01, message: "يجب أن يكون المبلغ أكبر من الصفر" },
              valueAsNumber: true,
            })}
            error={errors.amount?.message}
            className="text-sm sm:text-base"
          />

          {(type === "sell_to" || type === "buy") && (
            <Input
              label="السعر"
              type="number"
              step="0.01"
              min="0.01"
              {...register("price", {
                required:
                  type === "sell_to" || type === "buy"
                    ? "حقل السعر مطلوب"
                    : false,
                min: {
                  value: 0.01,
                  message: "يجب أن يكون السعر أكبر من الصفر",
                },
                valueAsNumber: true,
              })}
              error={errors.price?.message}
              className="text-sm sm:text-base"
            />
          )}
        </div>

        {/* Country/City */}
        <Input
          label="البلد/المدينة"
          {...register("country_city", {
            required: "حقل البلد/المدينة مطلوب",
          })}
          error={errors.country_city?.message}
          className="text-sm sm:text-base"
        />

        {/* Currency and Treasury in responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Currency Select */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">
              العملة
            </label>
            <select
              {...register("currency", {
                required: "حقل العملة مطلوب",
              })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-gray-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {currencyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {errors.currency && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">
                {errors.currency.message}
              </p>
            )}
          </div>

          {/* Treasury Select */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">
              اختر مكان الخزينة
            </label>
            <select
              {...register("Treasury")}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-gray-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">اختر مكان الخزينة</option>
              {TreasuryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {errors.Treasury && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">
                {errors.Treasury.message}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1 text-right">
              المختار: {watchedData.Treasury || "لم يتم الاختيار"}
            </p>
          </div>
        </div>

        {/* Notes Textarea */}
        <div>
          <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">
            ملاحظة (اختياري)
          </label>
          <textarea
            {...register("notes")}
            className="w-full px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl border border-gray-300 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            placeholder="أدخل ملاحظات إضافية..."
          />
        </div>

        {/* Paper Category - Hidden but included in form */}
        <input type="hidden" {...register("paper_category")} />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 space-x-0 sm:space-x-4 rtl:space-x-reverse pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1 text-sm sm:text-base py-2 sm:py-3"
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="flex-1 text-sm sm:text-base py-2 sm:py-3"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>

        {/* Form Status Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-700 text-center">
            {`جاري إضافة معاملة ${typeLabels[type]} - تأكد من صحة البيانات قبل الحفظ`}
          </p>
        </div>

        {/* Form Data Preview (for debugging) */}
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            معاينة البيانات:
          </h4>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(watchedData, null, 2)}
          </pre>
        </div>
      </form>
    </Modal>
  );
};
