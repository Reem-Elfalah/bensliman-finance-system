import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card } from "../ui/Card";

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<{ error: any }>;
  onSwitchToSignup: () => void;
  loading: boolean;
}

interface FormData {
  email: string;
  password: string;
}

export function LoginForm({
  onLogin,
  onSwitchToSignup,
  loading,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    if (!data.email || !data.password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const { error } = await onLogin(data.email.trim(), data.password);
      if (error) {
        console.error("Login error:", error);
        if (error.message.includes("Invalid login credentials")) {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        } else if (error.message.includes("Email not confirmed")) {
          setError("يرجى تأكيد البريد الإلكتروني أولاً");
        } else {
          setError(error.message || "حدث خطأ أثناء تسجيل الدخول");
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <Card className="p-8">
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="w-60 h-60 mx-auto mb-4"
          >
            <img
              src="/applogo.png"
              alt="App Logo"
              className="w-full h-full object-contain"
            />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">مرحباً بك</h1>
          <p className="text-gray-600">سجل دخولك لإدارة معاملاتك المالية</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              البريد الإلكتروني
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                autoComplete="email"
                className={`
                  w-full px-4 py-3 pl-10 rounded-xl border border-gray-300 
                  focus:ring-2 focus:ring-[#212E5B] focus:border-transparent
                  bg-white/70 backdrop-blur-sm transition-all duration-200
                  placeholder-gray-400 text-left
                  ${errors.email ? "border-red-500 focus:ring-red-500" : ""}
                `}
                placeholder="example@email.com"
                {...register("email", {
                  required: "البريد الإلكتروني مطلوب",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "البريد الإلكتروني غير صحيح",
                  },
                })}
              />
            </div>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600 mt-1"
              >
                {errors.email.message}
              </motion.p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              كلمة المرور
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className={`
                  w-full px-4 py-3 pl-10 pr-10 rounded-xl border border-gray-300 
                  focus:ring-2 focus:ring-[#212E5B] focus:border-transparent
                  bg-white/70 backdrop-blur-sm transition-all duration-200
                  placeholder-gray-400 text-left
                  ${errors.password ? "border-red-500 focus:ring-red-500" : ""}
                `}
                placeholder="••••••••"
                {...register("password", {
                  required: "كلمة المرور مطلوبة",
                  minLength: {
                    value: 6,
                    message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
                  },
                })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-600 mt-1"
              >
                {errors.password.message}
              </motion.p>
            )}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
            >
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting || loading}
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
