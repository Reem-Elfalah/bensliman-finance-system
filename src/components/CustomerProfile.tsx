// src/pages/CustomerProfile.tsx
import React, { useEffect, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/Button";
import { motion } from "framer-motion";
import { useAuth } from "../hooks/useAuth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { AddAccountDialog } from "../components/AddAccountDialog";

import {
  User,
  LogOut,
  Users,
  Phone,
  Mail,
  Edit,
  Save,
  X,
  History,
  CreditCard,
} from "lucide-react";

type Transaction = {
  id: string;
  CustomerName: string;
  type: string;
  amount: number | null;
  currency: string | null;
  created_at: string;
  price?: number | null;
};

type Customer = {
  id: string;
  name: string;
  phones: string[];
  email?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
};

type CustomerBackup = {
  id: string;
  customer_id: string;
  old_data: Customer;
  new_data: Customer;
  changed_by: string;
  changed_by_email?: string;
  changed_by_display_name?: string;
  created_at: string;
  reason?: string;
};

const typeMap: Record<string, string> = {
  buy: "شراء",
  sell_to: "بيع الي",
  entry: "دخول",
  exit: "خروج",
};

export default function CustomerProfile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const customerFromState = location.state?.customer;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customerDetails, setCustomerDetails] = useState<Customer | null>(null);
  const [customerBackups, setCustomerBackups] = useState<CustomerBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBackupHistory, setShowBackupHistory] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    phones: [""],
    email: "",
    status: "active",
    notes: "",
  });

  const [originalData, setOriginalData] = useState<Customer | null>(null);

  // Validation states
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    phones?: string[];
    email?: string;
  }>({});

  // Filters
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currency, setCurrency] = useState<string>("");
  const [dateError, setDateError] = useState<string>("");

  // Currency list
  const [currencies, setCurrencies] = useState<{ id: string; name: string }[]>(
    []
  );

  // Phone number validation
  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone.trim()) return false;

    // Supports international formats:
    // +1234567890, 1234567890, 123-456-7890, (123) 456-7890, 123.456.7890
    const phoneRegex =
      /^[\+]?[1-9][\d]{0,15}$|^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,8}$/;
    const cleanedPhone = phone.replace(/[\s\-\(\)\.]/g, "");
    return phoneRegex.test(cleanedPhone) && cleanedPhone.length >= 8;
  };

  // Format phone number for display - FIXED: Remove second dash
  const formatPhoneNumber = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, "");

    // For 10-digit numbers (like 0922921143) - format as 092-2921143
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{3})(\d{7})/, "$1-$2");
    }

    // For 11-digit numbers (like 00966512345678) - format as 00966-512345678
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{5})(\d{6})/, "$1-$2");
    }

    // For 12-digit international numbers (like +966512345678) - format as +966 51 234 5678
    if (cleaned.length === 12 && cleaned.startsWith("+")) {
      return cleaned.replace(/(\+\d{3})(\d{2})(\d{3})(\d{4})/, "$1 $2 $3 $4");
    }

    // For other formats, return as is
    return phone;
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    if (!email.trim()) return true; // Empty is valid (optional)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validate all fields
  const validateForm = (): boolean => {
    const errors: {
      name?: string;
      phones?: string[];
      email?: string;
    } = {};

    // Name validation
    if (!editForm.name.trim()) {
      errors.name = "اسم العميل مطلوب";
    }

    // Phone validation
    const phoneErrors: string[] = [];
    const validPhones = editForm.phones.filter((phone) => phone.trim() !== "");

    if (validPhones.length === 0) {
      phoneErrors.push("رقم هاتف واحد على الأقل مطلوب");
    } else {
      editForm.phones.forEach((phone, index) => {
        if (phone.trim() && !validatePhoneNumber(phone)) {
          phoneErrors[index] = "رقم الهاتف غير صحيح";
        }
      });
    }

    if (phoneErrors.length > 0) {
      errors.phones = phoneErrors;
    }

    // Email validation
    if (editForm.email.trim() && !validateEmail(editForm.email)) {
      errors.email = "البريد الإلكتروني غير صحيح";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Fetch Currencies
  useEffect(() => {
    const fetchCurrencies = async () => {
      const { data, error } = await supabase.from("currencies").select("*");
      if (error) {
        console.error("Error fetching currencies:", error);
      } else {
        setCurrencies(data || []);
      }
    };

    fetchCurrencies();
  }, []);

  // Fetch customer data
  useEffect(() => {
    const fetchCustomerData = async () => {
      let customerData = customerFromState;

      if (!customerData?.id) {
        // Try to get customer from localStorage if state is lost
        const savedCustomer = localStorage.getItem("currentCustomer");
        if (savedCustomer) {
          try {
            customerData = JSON.parse(savedCustomer);
          } catch (error) {
            console.error("Error parsing saved customer:", error);
            return;
          }
        } else {
          return;
        }
      }

      setLoading(true);

      try {
        // Fetch customer details
        const { data: customerDataFromDB, error: customerError } =
          await supabase
            .from("customers")
            .select("*")
            .eq("id", customerData.id)
            .single();

        if (customerError) {
          console.error("Error fetching customer details:", customerError);
        } else {
          setCustomerDetails(customerDataFromDB);
          setEditForm({
            name: customerDataFromDB.name,
            phones:
              customerDataFromDB.phones && customerDataFromDB.phones.length > 0
                ? customerDataFromDB.phones
                : [""],
            email: customerDataFromDB.email || "",
            status: customerDataFromDB.status,
            notes: customerDataFromDB.notes || "",
          });
          setOriginalData(customerDataFromDB);

          // Save to localStorage for restore
          localStorage.setItem(
            "currentCustomer",
            JSON.stringify(customerDataFromDB)
          );
        }

        // Fetch customer backups (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: backupsData, error: backupsError } = await supabase
          .from("customer_backups")
          .select("*")
          .eq("customer_id", customerData.id)
          .gte("created_at", thirtyDaysAgo.toISOString())
          .order("created_at", { ascending: false });

        if (backupsError) {
          console.error("Error fetching customer backups:", backupsError);
        } else {
          setCustomerBackups(backupsData || []);
        }

        // Fetch transactions
        const { data: transactionsData, error: transactionsError } =
          await supabase
            .from("transactions")
            .select("*")
            .eq("CustomerName", customerDataFromDB?.name || customerData.name)
            .order("created_at", { ascending: false });

        if (transactionsError) {
          console.error("Error fetching transactions:", transactionsError);
        } else {
          setTransactions(transactionsData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerData();
  }, [customerFromState?.id]);

  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setDateError("التاريخ من لا يمكن أن يكون بعد التاريخ إلى");
    } else {
      setDateError("");
    }
  }, [startDate, endDate]);

  // Handle edit form changes
  const handleEditChange = (field: string, value: string, index?: number) => {
    // Clear validation errors when user starts typing
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }

    if (field === "phones" && index !== undefined) {
      const newPhones = [...editForm.phones];
      newPhones[index] = value;
      setEditForm((prev) => ({ ...prev, phones: newPhones }));

      // Clear specific phone error
      if (validationErrors.phones?.[index]) {
        const newPhoneErrors = [...(validationErrors.phones || [])];
        newPhoneErrors[index] = "";
        setValidationErrors((prev) => ({
          ...prev,
          phones: newPhoneErrors,
        }));
      }
    } else {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Add new phone field
  const addPhoneField = () => {
    setEditForm((prev) => ({ ...prev, phones: [...prev.phones, ""] }));
  };

  // Remove phone field
  const removePhoneField = (index: number) => {
    if (editForm.phones.length > 1) {
      const newPhones = editForm.phones.filter((_, i) => i !== index);
      setEditForm((prev) => ({ ...prev, phones: newPhones }));

      // Remove corresponding validation error
      if (validationErrors.phones?.[index]) {
        const newPhoneErrors = validationErrors.phones.filter(
          (_, i) => i !== index
        );
        setValidationErrors((prev) => ({
          ...prev,
          phones: newPhoneErrors.length > 0 ? newPhoneErrors : undefined,
        }));
      }
    }
  };

  // Start editing - save original data
  const startEditing = () => {
    if (customerDetails) {
      setOriginalData(customerDetails);
      setIsEditing(true);
      setValidationErrors({});
    }
  };

  // Cancel editing - restore original data
  const handleCancelEdit = () => {
    if (originalData) {
      setEditForm({
        name: originalData.name,
        phones:
          originalData.phones && originalData.phones.length > 0
            ? originalData.phones
            : [""],
        email: originalData.email || "",
        status: originalData.status,
        notes: originalData.notes || "",
      });
    }
    setValidationErrors({});
    setIsEditing(false);
  };

  // Check if form has changes
  const hasChanges = () => {
    if (!originalData) return false;

    return (
      editForm.name !== originalData.name ||
      JSON.stringify(editForm.phones) !==
        JSON.stringify(originalData.phones || [""]) ||
      editForm.email !== (originalData.email || "") ||
      editForm.status !== originalData.status ||
      editForm.notes !== (originalData.notes || "")
    );
  };

  // Save customer edits with backup system
  const handleSaveEdit = async () => {
    if (!customerDetails || !user) return;

    // Validate form
    if (!validateForm()) {
      alert("الرجاء تصحيح الأخطاء قبل الحفظ");
      return;
    }

    setSaving(true);

    try {
      console.log(" Starting save process...");

      // Prepare update data
      const validPhones = editForm.phones.filter(
        (phone) => phone.trim() !== ""
      );
      const updateData = {
        name: editForm.name.trim(),
        phones: validPhones,
        email: editForm.email.trim() || null,
        status: editForm.status,
        notes: editForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      console.log(" Update data:", updateData);

      // Create backup before updating
      console.log(" Creating backup...");
      const backupResult = await supabase.from("customer_backups").insert([
        {
          customer_id: customerDetails.id,
          old_data: customerDetails,
          new_data: {
            ...customerDetails,
            ...updateData,
          },
          changed_by: user.id,
          changed_by_email: user.email,
          changed_by_display_name: user.email,
          reason: "تعديل بيانات العميل",
        },
      ]);

      console.log(" Backup result:", backupResult);

      if (backupResult.error) {
        console.error(" Backup failed:", backupResult.error);
        throw new Error("فشل في إنشاء نسخة احتياطية");
      }

      // Update customer data
      console.log(" Updating customer...");
      const updateResult = await supabase
        .from("customers")
        .update(updateData)
        .eq("id", customerDetails.id)
        .select();

      console.log(" Update result:", updateResult);

      if (updateResult.error) {
        console.error(" Update failed:", updateResult.error);
        throw new Error(`فشل في تحديث البيانات: ${updateResult.error.message}`);
      }

      console.log(" Customer update successful!");

      // Refresh customer data
      const { data: updatedCustomer, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerDetails.id)
        .single();

      if (fetchError) {
        console.error("Failed to fetch updated customer:", fetchError);
        throw fetchError;
      }

      // Refresh backups list
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: newBackups } = await supabase
        .from("customer_backups")
        .select("*")
        .eq("customer_id", customerDetails.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      setCustomerBackups(newBackups || []);

      // Update ALL local states
      setCustomerDetails(updatedCustomer);
      setOriginalData(updatedCustomer);
      setEditForm({
        name: updatedCustomer.name,
        phones:
          updatedCustomer.phones && updatedCustomer.phones.length > 0
            ? updatedCustomer.phones
            : [""],
        email: updatedCustomer.email || "",
        status: updatedCustomer.status,
        notes: updatedCustomer.notes || "",
      });

      // Update localStorage
      localStorage.setItem("currentCustomer", JSON.stringify(updatedCustomer));

      setIsEditing(false);
      setValidationErrors({});
      alert("تم حفظ التعديلات بنجاح");
    } catch (error) {
      console.error(" Error in save process:", error);
      alert(
        " حدث خطأ أثناء حفظ التعديلات: " +
        (error instanceof Error ? error.message : "خطأ غير معروف")
      );
    } finally {
      setSaving(false);
    }
  };

  // Restore from backup - FIXED VERSION
  const handleRestoreBackup = async (backup: CustomerBackup) => {
    if (!user || !customerDetails) return;

    if (
      !confirm(" هل تريد استعادة هذه النسخة؟ سيتم فقدان التعديلات الحالية.")
    ) {
      return;
    }

    try {
      // Create backup of current state before restoring
      const currentBackupResult = await supabase
        .from("customer_backups")
        .insert([
          {
            customer_id: customerDetails.id,
            old_data: customerDetails,
            new_data: backup.old_data,
            changed_by: user.id,
            changed_by_email: user.email,
            changed_by_display_name: user.email,
            reason: "استعادة من نسخة احتياطية",
          },
        ]);

      if (currentBackupResult.error) throw currentBackupResult.error;

      // Restore from backup
      const restoreResult = await supabase
        .from("customers")
        .update(backup.old_data)
        .eq("id", customerDetails.id)
        .select();

      if (restoreResult.error) throw restoreResult.error;

      // Refresh ALL data from database
      const { data: restoredCustomer, error: fetchError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerDetails.id)
        .single();

      if (fetchError) throw fetchError;

      // Update ALL local states
      setCustomerDetails(restoredCustomer);
      setOriginalData(restoredCustomer);
      setEditForm({
        name: restoredCustomer.name,
        phones:
          restoredCustomer.phones && restoredCustomer.phones.length > 0
            ? restoredCustomer.phones
            : [""],
        email: restoredCustomer.email || "",
        status: restoredCustomer.status,
        notes: restoredCustomer.notes || "",
      });

      // Update localStorage
      localStorage.setItem("currentCustomer", JSON.stringify(restoredCustomer));

      // Refresh transactions with the restored name
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("*")
        .eq("CustomerName", restoredCustomer.name)
        .order("created_at", { ascending: false });

      setTransactions(transactionsData || []);

      // Refresh backups list
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: newBackups } = await supabase
        .from("customer_backups")
        .select("*")
        .eq("customer_id", customerDetails.id)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      setCustomerBackups(newBackups || []);
      setShowBackupHistory(false);
      setIsEditing(false);
      setValidationErrors({});

      alert("تم استعادة البيانات بنجاح");
    } catch (error) {
      console.error("Error restoring backup:", error);
      alert(" حدث خطأ أثناء استعادة البيانات");
    }
  };

  // Early return for no customer
  if (!customerDetails && !loading) {
    return (
      <div className="p-6">
        <p className="text-red-500">لا يوجد بيانات للعميل</p>
        <Link to="/customers">
          <Button className="mt-4">العملاء</Button>
        </Link>
      </div>
    );
  }

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    const tDate = new Date(t.created_at);
    tDate.setHours(0, 0, 0, 0);

    if (startDate) {
      const sDate = new Date(startDate);
      sDate.setHours(0, 0, 0, 0);
      if (tDate < sDate) return false;
    }

    if (endDate) {
      const eDate = new Date(endDate);
      eDate.setHours(0, 0, 0, 0);
      if (tDate > eDate) return false;
    }

    if (currency && t.currency !== currency) return false;
    return true;
  });

  const formatTableDate = (date: Date) => format(date, "d/M/yyyy");
  const formatDateTime = (date: Date) => format(date, "d/M/yyyy HH:mm");
  console.log("Sell_to transactions:", filteredTransactions.filter(t => t.type === "sell_to"));
  console.log("buy transactions:", filteredTransactions.filter(t => t.type === "buy"));


  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50"
      dir="rtl"
    >
      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <Link to="/" className="flex-shrink-0">
                <img
                  src="/applogo.png"
                  alt="App Logo"
                  className="w-20 h-20 sm:w-32 sm:h-32 lg:w-40 lg:h-40 object-contain"
                />
              </Link>
              <div className="text-center sm:text-right">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  نظام المعاملات المالية
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">
                  مرحباً، {user?.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Link to="/customers" className="w-full sm:w-auto">
                <Button
                  style={{
                    background: "linear-gradient(to right, #212E5B, #4B5472)",
                  }}
                  className="flex items-center justify-center gap-2 py-2 sm:py-3 w-full sm:w-auto text-xs sm:text-sm"
                >
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">العملاء</span>
                  <span className="sm:hidden">العملاء</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={signOut}
                className="flex items-center justify-center gap-2 py-2 sm:py-3 w-full sm:w-auto text-xs sm:text-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">تسجيل الخروج</span>
                <span className="sm:hidden">خروج</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-6xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 mt-4 sm:mt-6">
        {/* Customer Header with Info */}
        <div className="border-b pb-4 sm:pb-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-200 flex items-center justify-center shadow-md flex-shrink-0">
              <User className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
                    الملف الشخصي للعميل
                  </h1>
                  {isEditing ? (
                    <div>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) =>
                          handleEditChange("name", e.target.value)
                        }
                        className={`text-[#212E5B] text-lg sm:text-xl font-semibold border rounded-lg p-2 w-full max-w-md ${
                          validationErrors.name
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                        placeholder="اسم العميل"
                      />
                      {validationErrors.name && (
                        <p className="text-red-500 text-sm mt-1">
                          {validationErrors.name}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[#212E5B] text-lg sm:text-xl font-semibold">
                      {customerDetails?.name}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap">
                  {!isEditing ? (
                    <>
                      <AddAccountDialog
                        open={isAddAccountOpen}
                        onOpenChange={setIsAddAccountOpen}
                        customerName={customerDetails?.name || ""}
                      />
                      <Button
                        variant="outline"
                        icon={Edit}
                        onClick={startEditing}
                        className="flex items-center gap-2"
                      >
                        تعديل
                      </Button>
                      <Button
                        variant="outline"
                        icon={History}
                        onClick={() => setShowBackupHistory(true)}
                        className="flex items-center gap-2"
                      >
                        السجل
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="primary"
                        icon={Save}
                        onClick={handleSaveEdit}
                        disabled={saving || !hasChanges()}
                        className="flex items-center gap-2"
                      >
                        {saving ? "جاري الحفظ..." : "حفظ"}
                      </Button>
                      <Button
                        variant="outline"
                        icon={X}
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2"
                        disabled={saving}
                      >
                        إلغاء
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Customer Details */}
              <div className="mt-4 space-y-3">
                {/* Phone Numbers */}
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-gray-700 font-medium text-sm sm:text-base">
                      الهاتف:
                    </span>
                    {isEditing ? (
                      <div className="space-y-2 mt-1">
                        {editForm.phones.map((phone, index) => (
                          <div key={index} className="flex gap-2 items-start">
                            <div className="flex-1">
                              <input
                                type="tel"
                                value={phone}
                                onChange={(e) =>
                                  handleEditChange(
                                    "phones",
                                    e.target.value,
                                    index
                                  )
                                }
                                className={`border rounded-lg p-2 w-full text-sm ${
                                  validationErrors.phones?.[index]
                                    ? "border-red-500"
                                    : "border-gray-300"
                                }`}
                                placeholder="أدخل رقم الهاتف (مثال: 0921234567 أو 0911234567)"
                              />
                              {validationErrors.phones?.[index] && (
                                <p className="text-red-500 text-xs mt-1">
                                  {validationErrors.phones[index]}
                                </p>
                              )}
                            </div>
                            {editForm.phones.length > 1 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removePhoneField(index)}
                                className="text-red-500 hover:text-red-700 mt-2"
                                type="button"
                              >
                                حذف
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addPhoneField}
                          className="text-blue-500 hover:text-blue-700"
                          type="button"
                        >
                          + إضافة رقم
                        </Button>
                        {validationErrors.phones &&
                          typeof validationErrors.phones === "string" && (
                            <p className="text-red-500 text-sm mt-1">
                              {validationErrors.phones}
                            </p>
                          )}
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap mt-1">
                        {customerDetails?.phones?.map((phone, index) => (
                          <span
                            key={index}
                            className="bg-gray-100 px-3 py-1 rounded-lg text-sm"
                          >
                            {formatPhoneNumber(phone)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-gray-700 font-medium text-sm sm:text-base">
                      البريد الإلكتروني:
                    </span>
                    {isEditing ? (
                      <div>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            handleEditChange("email", e.target.value)
                          }
                          className={`border rounded-lg p-2 w-full max-w-xs text-sm mt-1 ${
                            validationErrors.email
                              ? "border-red-500"
                              : "border-gray-300"
                          }`}
                          placeholder="example@email.com (اختياري)"
                        />
                        {validationErrors.email && (
                          <p className="text-red-500 text-sm mt-1">
                            {validationErrors.email}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm mt-1 inline-block">
                        {customerDetails?.email || "غير محدد"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 font-medium text-sm sm:text-base">
                    الحالة:
                  </span>
                  {isEditing ? (
                    <select
                      value={editForm.status}
                      onChange={(e) =>
                        handleEditChange("status", e.target.value)
                      }
                      className="border border-gray-300 rounded-lg p-2 text-sm"
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">غير نشط</option>
                    </select>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-lg text-sm ${
                        customerDetails?.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {customerDetails?.status === "active" ? "نشط" : "غير نشط"}
                    </span>
                  )}
                </div>

                {/* Notes */}
                {(customerDetails?.notes || isEditing) && (
                  <div className="flex items-start gap-2">
                    <span className="text-gray-700 font-medium text-sm sm:text-base mt-1">
                      ملاحظات:
                    </span>
                    {isEditing ? (
                      <textarea
                        value={editForm.notes}
                        onChange={(e) =>
                          handleEditChange("notes", e.target.value)
                        }
                        className="border border-gray-300 rounded-lg p-2 flex-1 text-sm"
                        rows={3}
                        placeholder="ملاحظات (اختياري)"
                      />
                    ) : (
                      <span className="bg-gray-100 px-3 py-1 rounded-lg text-sm flex-1 mt-1">
                        {customerDetails?.notes}
                      </span>
                    )}
                  </div>
                )}

                {/* Last Updated */}
                {customerDetails?.updated_at && (
                  <div className="text-xs text-gray-500 mt-2">
                    آخر تحديث:{" "}
                    {formatDateTime(new Date(customerDetails.updated_at))}
                  </div>
                )}

                {/* Changes Indicator */}
                {isEditing && hasChanges() && (
                  <div className="text-xs text-orange-600 mt-2 bg-orange-50 px-3 py-1 rounded-lg">
                    ⚠️ لديك تغييرات غير محفوظة
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Backup History Modal */}
        {showBackupHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">
                    سجل التعديلات (آخر 30 يوم)
                  </h3>
                  <Button
                    variant="outline"
                    icon={X}
                    onClick={() => setShowBackupHistory(false)}
                  >
                    إغلاق
                  </Button>
                </div>

                {customerBackups.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">لا توجد نسخ احتياطية</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {customerBackups.map((backup) => (
                      <div
                        key={backup.id}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">
                              {formatDateTime(new Date(backup.created_at))}
                            </p>
                            <p className="text-sm text-gray-600">
                              تم التعديل بواسطة:{" "}
                              {backup.changed_by_display_name ||
                                backup.changed_by_email ||
                                backup.changed_by}
                            </p>
                            {backup.reason && (
                              <p className="text-sm text-gray-600">
                                السبب: {backup.reason}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreBackup(backup)}
                            className="text-green-600 hover:text-green-800 whitespace-nowrap"
                          >
                            استعادة
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-red-600 mb-2">
                              البيانات السابقة:
                            </h4>
                            <p>
                              <strong>الاسم:</strong> {backup.old_data.name}
                            </p>
                            <p>
                              <strong>الهاتف:</strong>{" "}
                              {backup.old_data.phones?.join("، ")}
                            </p>
                            <p>
                              <strong>البريد:</strong>{" "}
                              {backup.old_data.email || "غير محدد"}
                            </p>
                            <p>
                              <strong>الحالة:</strong>{" "}
                              {backup.old_data.status === "active"
                                ? "نشط"
                                : "غير نشط"}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-green-600 mb-2">
                              البيانات الجديدة:
                            </h4>
                            <p>
                              <strong>الاسم:</strong> {backup.new_data.name}
                            </p>
                            <p>
                              <strong>الهاتف:</strong>{" "}
                              {backup.new_data.phones?.join("، ")}
                            </p>
                            <p>
                              <strong>البريد:</strong>{" "}
                              {backup.new_data.email || "غير محدد"}
                            </p>
                            <p>
                              <strong>الحالة:</strong>{" "}
                              {backup.new_data.status === "active"
                                ? "نشط"
                                : "غير نشط"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            تصفية المعاملات
          </h2>
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              <div>
                <label className="block text-gray-700 mb-2 text-sm font-medium">
                  من:
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => setStartDate(date)}
                  dateFormat="d/M/yyyy"
                  locale={ar}
                  className="border border-gray-300 rounded-lg p-3 text-right w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholderText="يوم/شهر/سنة"
                  wrapperClassName="w-full"
                  isClearable
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2 text-sm font-medium">
                  إلي:
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={(date) => setEndDate(date)}
                  dateFormat="d/M/yyyy"
                  locale={ar}
                  className="border border-gray-300 rounded-lg p-3 text-right w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholderText="يوم/شهر/سنة"
                  wrapperClassName="w-full"
                  isClearable
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2 text-sm font-medium">
                  العملة:
                </label>
                <select
                  value={currency || ""}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="border border-gray-300 rounded-lg p-3 w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">كل العملات</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                {(startDate || endDate || currency) && (
                  <Button
                    variant="outline"
                    className="w-full h-12 text-sm border-gray-300 hover:bg-gray-50"
                    onClick={() => {
                      setStartDate(null);
                      setEndDate(null);
                      setCurrency("");
                      setDateError("");
                    }}
                  >
                    مسح الفلاتر
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {dateError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm flex items-center gap-2">
              <span>⚠️</span>
              {dateError}
            </p>
          </div>
        )}

        {/* Transactions Count */}
        {!loading && filteredTransactions.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm">
              عرض{" "}
              <span className="font-semibold">
                {filteredTransactions.length}
              </span>{" "}
              من أصل{" "}
              <span className="font-semibold">{transactions.length}</span>{" "}
              معاملة
            </p>
          </div>
        )}

        {/* Transactions Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#212E5B] mx-auto"></div>
            <p className="text-gray-600 mt-3 text-sm">
              جاري تحميل المعاملات...
            </p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              {transactions.length === 0
                ? "لا توجد معاملات لهذا العميل."
                : "لا توجد معاملات تطابق الفلاتر المحددة."}
            </p>
            <p className="text-gray-400 text-sm">
              {transactions.length === 0
                ? "سيتم عرض المعاملات هنا عند إضافتها."
                : "جرب تغيير الفلاتر لعرض المزيد من النتائج."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">

            {/* Desktop Table */}
            <table className="min-w-full border border-gray-300 text-sm hidden sm:table">
              <thead className="bg-[#212E5B] text-white">
                <tr>
                  <th className="border p-3 text-center text-sm font-semibold">
                    تاريخ العملية
                  </th>
                  <th className="border p-3 text-center text-sm font-semibold">
                    نوع العملية
                  </th>
                  <th className="border p-3 text-center text-sm font-semibold">
                    المبلغ
                  </th>
                  <th className="border p-3 text-center text-sm font-semibold">
                    العملة
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t, index) => (
                  <tr
                    key={t.id}
                    className={`hover:bg-gray-50 transition ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="border p-3 text-center text-sm">
                      {formatTableDate(new Date(t.created_at))}
                    </td>
                    <td className="border p-3 text-center text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          t.type === "buy"
                            ? "bg-green-100 text-green-800"
                            : t.type === "sell_to"
                            ? "bg-red-100 text-red-800"
                            : t.type === "entry"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {typeMap[t.type] || t.type}
                      </span>
                    </td>

                    <td className="border p-3 text-center text-sm font-medium">
                      {(t.type === "sell_to" || t.type === "buy")
                        ? t.price?.toLocaleString() ?? "-"
                        : (t.type === "exit" || t.type === "entry")
                          ? t.amount?.toLocaleString() ?? "-"
                          : "-"}
                    </td>


                    <td className="border p-3 text-center text-sm">
                      {t.currency ? (
                        <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs">
                          {currencies.find((c) => c.name === t.currency)
                            ?.name || t.currency}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {filteredTransactions.map((t) => (
                <div
                  key={t.id}
                  className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-600 text-xs block mb-1">
                        التاريخ:
                      </span>
                      <p className="text-sm font-medium">
                        {formatTableDate(new Date(t.created_at))}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs block mb-1">
                        النوع:
                      </span>
                      <p className="text-sm font-medium">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            t.type === "buy"
                              ? "bg-green-100 text-green-800"
                              : t.type === "sell_to"
                              ? "bg-red-100 text-red-800"
                              : t.type === "entry"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {typeMap[t.type] || t.type}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs block mb-1">
                        المبلغ:
                      </span>
                      <p className="text-sm font-medium">
                        {t.amount ? t.amount.toLocaleString() : "-"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs block mb-1">
                        العملة:
                      </span>
                      <p className="text-sm font-medium">
                        {t.currency ? (
                          <span className="bg-primary-100 text-primary-800 px-2 py-1 rounded-full text-xs">
                            {t.currency}
                          </span>
                        ) : (
                          "-"
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>


        )}
      </div>
    </div>
  );
}
