import React, { useRef, useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  Download,
  Share2,
  Printer,
  X,
  Edit,
  Save,
  MessageCircle,
  Mail,
} from "lucide-react";
import { Button } from "../ui/Button";
import jsPDF from "jspdf";
await document.fonts.ready;
import html2canvas from "html2canvas";

interface Transaction {
  id: string;
  type: "exit" | "sell_to" | "buy" | "entry";
  created_at: string;
  amount: number;
  country_city: string;
  paper_category: string;
  price: number;
  currency: string;
  name?: string;
  from_account?: string;
  to_account?: string;
  deliver_to?: string;
  notes?: string;
  to_account_name?: string;
  from_account_name?: string;
  CustomerName?: string;
  rate?: number;
  phone?: string; // Phone number field
  account?: string;
  treasuryCategory?: {
    id: string;
    name: string;
  };
  currency_final?: string;
}

interface InvoiceGeneratorProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (transaction: Transaction) => void;
}

const typeLabels = {
  exit: "خروج",
  sell_to: "بيع إلى",
  buy: "شراء من",
  entry: "دخول",
};

const toEnglishNumbers = (str: string | number): string => {
  const arabicNumbers = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const englishNumbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  let result = str.toString();
  for (let i = 0; i < arabicNumbers.length; i++) {
    result = result.replace(
      new RegExp(arabicNumbers[i], "g"),
      englishNumbers[i]
    );
  }
  return result;
};

const formatNumber = (num: number): string => {
  return toEnglishNumbers(num.toLocaleString("en-US"));
};

export function InvoiceGenerator({
  transaction,
  isOpen,
  onClose,
  onEdit,
}: InvoiceGeneratorProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [editedTransaction, setEditedTransaction] =
    useState<Transaction>(transaction);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneError, setPhoneError] = useState<string>("");
  const [showNotes, setShowNotes] = useState(false);

  // Use refs to store temporary input values during editing
  const tempInputValuesRef = useRef<Partial<Transaction>>({});

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setShowShareOptions(false);
      setIsSaving(false);
      setPhoneError("");
      setShowNotes(false);
      tempInputValuesRef.current = {};
    }
  }, [isOpen]);

  // Update transaction when prop changes
  useEffect(() => {
    setEditedTransaction(transaction);
    const hasValidNotes =
      transaction.notes &&
      transaction.notes.trim() !== "" &&
      transaction.notes.trim().toLowerCase() !== "optional";
    setShowNotes(hasValidNotes);
  }, [transaction]);

  const scrollPositionRef = useRef(0);

  // Handle modal positioning and body scroll
  // Update edited transaction when transaction prop changes

  useEffect(() => {
    if (!transaction) return;

    const updatedTransaction = { ...transaction };

    // Fill country_city based on transaction type if empty
    if (!updatedTransaction.country_city) {
      if (updatedTransaction.type === "exit") {
        updatedTransaction.country_city =
          updatedTransaction.from_account?.split(" - ")[1] || "";
      } else if (updatedTransaction.type === "entry") {
        updatedTransaction.country_city =
          updatedTransaction.to_account?.split(" - ")[1] ||
          updatedTransaction.account?.split(" - ")[1] ||
          "";
      } else if (updatedTransaction.type === "buy" || updatedTransaction.type === "sell_to") {
        updatedTransaction.country_city =
          updatedTransaction.treasuryCategory?.name || "غير محدد";
      }
    }

    // Update editedTransaction state
    setEditedTransaction(updatedTransaction);
  }, [transaction]);


  function getTotalAmount() {
    if (!editedTransaction.price || !editedTransaction.rate) return 0;

    const currencyFromWizard = editedTransaction.currency ?? "";

    return currencyFromWizard.trim() === "رممبي"
      ? editedTransaction.price / (editedTransaction.rate || 1) // divide if رممبي
      : editedTransaction.price * (editedTransaction.rate || 0); // multiply 
  }



  // Smart positioning when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      scrollPositionRef.current = window.scrollY;

      const timer = setTimeout(() => {
        if (modalRef.current) {
          const modalRect = modalRef.current.getBoundingClientRect();
          const viewportHeight = window.innerHeight;

          if (modalRect.top < 0 || modalRect.bottom > viewportHeight) {
            const currentScrollY = window.scrollY;
            const modalTop = modalRect.top + currentScrollY;
            let targetScrollY;

            if (modalRect.height >= viewportHeight * 0.9) {
              targetScrollY = modalTop - 20;
            } else {
              targetScrollY =
                modalTop - (viewportHeight - modalRect.height) / 2;
            }

            targetScrollY = Math.max(0, targetScrollY);
            window.scrollTo({ top: targetScrollY, behavior: "smooth" });
          }
        }
      }, 100);

      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "unset";
      };
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  const handleClose = () => {
    setTimeout(() => {
      window.scrollTo(0, scrollPositionRef.current);
    }, 100);
    onClose();
  };

  const handleEdit = () => {
    setIsEditing(true);
    // Initialize temp values with current edited transaction
    tempInputValuesRef.current = { ...editedTransaction };
  };

  const handleSave = async () => {
    if (!onEdit) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setPhoneError("");

    try {
      // Create updated transaction with temp values
      const updatedTransaction = {
        ...editedTransaction,
        ...tempInputValuesRef.current,
      };

      await onEdit(updatedTransaction);
      setEditedTransaction(updatedTransaction);
      setIsEditing(false);

      const hasValidNotes =
        updatedTransaction.notes &&
        updatedTransaction.notes.trim() !== "" &&
        updatedTransaction.notes.trim().toLowerCase() !== "optional";
      setShowNotes(hasValidNotes);

      alert("تم حفظ التعديلات بنجاح!");
    } catch (error) {
      console.error("Error saving transaction:", error);
      alert("حدث خطأ أثناء حفظ التعديلات");
    } finally {
      setIsSaving(false);
      tempInputValuesRef.current = {};
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setPhoneError("");
    const hasValidNotes =
      transaction.notes &&
      transaction.notes.trim() !== "" &&
      transaction.notes.trim().toLowerCase() !== "optional";
    setShowNotes(hasValidNotes);
    tempInputValuesRef.current = {};
  };

  // Get current value for input (from temp ref if editing, from state if not)
  const getInputValue = (field: keyof Transaction): any => {
    if (isEditing && tempInputValuesRef.current[field] !== undefined) {
      return tempInputValuesRef.current[field];
    }
    return editedTransaction[field];
  };

  // Text input change handler - updates temp ref without causing re-renders
  const handleTextChange = useCallback(
    (field: keyof Transaction) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        tempInputValuesRef.current[field] = e.target.value as any;
      },
    []
  );

  // Number input change handler
  const handleNumberChange = useCallback(
    (field: keyof Transaction) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value === "" ? 0 : parseFloat(e.target.value);
      tempInputValuesRef.current[field] = value as any;
    },
    []
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow numbers
      const value = e.target.value.replace(/[^\d]/g, "");
      tempInputValuesRef.current.phone = value;
      setPhoneError(""); // Clear any previous errors
    },
    []
  );

  // Handle phone input key press to prevent non-numeric characters
  const handlePhoneKeyPress = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow only numbers and control keys
      if (
        !/[0-9]/.test(e.key) &&
        e.key !== "Backspace" &&
        e.key !== "Delete" &&
        e.key !== "Tab" &&
        e.key !== "Enter" &&
        e.key !== "ArrowLeft" &&
        e.key !== "ArrowRight" &&
        e.key !== "Home" &&
        e.key !== "End"
      ) {
        e.preventDefault();
      }
    },
    []
  );

  const toggleNotes = () => {
    setShowNotes(!showNotes);
  };

  // Check for valid notes
  const hasValidNotes =
    editedTransaction.notes &&
    editedTransaction.notes.trim() !== "" &&
    editedTransaction.notes.trim().toLowerCase() !== "optional";

  // Rest of your functions (generatePDF, handlePrint, etc.) remain the same...
  const generatePDFBlob = async (): Promise<Blob | null> => {
    if (!invoiceRef.current) return null;
    await document.fonts.ready;
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        imageTimeout: 15000,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [imgWidth, imgHeight],
      });

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      return pdf.output("blob");
    } catch (error) {
      console.error("Error generating PDF blob:", error);
      return null;
    }
  };

  const generatePDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);

    try {
      const pdfBlob = await generatePDFBlob();
      if (!pdfBlob) {
        alert("حدث خطأ أثناء إنشاء ملف PDF");
        return;
      }

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = editedTransaction.CustomerName
        ? `إيصال-${editedTransaction.CustomerName}.pdf`
        : `إيصال.pdf`;

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert("تم تحميل الإيصال بصيغة PDF بنجاح!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("حدث خطأ أثناء إنشاء ملف PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!invoiceRef.current) return;

    const printContent = invoiceRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    document.body.innerHTML = `
      <div style="direction: rtl; font-family: Arial, sans-serif;">
        ${printContent}
      </div>
    `;

    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const handleShare = () => {
    setShowShareOptions(true);
  };

  const shareViaWhatsApp = async () => {
    setIsSharing(true);
    setShowShareOptions(false);

    try {
      const pdfBlob = await generatePDFBlob();
      if (!pdfBlob) {
        alert("حدث خطأ أثناء إنشاء ملف PDF للمشاركة");
        return;
      }

      const fileName = editedTransaction.CustomerName
        ? `إيصال-${editedTransaction.CustomerName}.pdf`
        : `إيصال.pdf`;

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const shareText = `إيصال ${typeLabels[editedTransaction.type]
        } - المبلغ: ${formatNumber(editedTransaction.amount)} ${editedTransaction.currency
        }`;
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        shareText
      )}`;

      window.open(whatsappUrl, "_blank");
      setTimeout(() => downloadFile(pdfUrl, fileName), 500);
    } catch (error) {
      console.error("Error in WhatsApp share process:", error);
      alert("حدث خطأ أثناء مشاركة الإيصال");
    } finally {
      setIsSharing(false);
    }
  };

  const shareViaEmail = async () => {
    setIsSharing(true);
    setShowShareOptions(false);

    try {
      const pdfBlob = await generatePDFBlob();
      if (!pdfBlob) {
        alert("حدث خطأ أثناء إنشاء ملف PDF للمشاركة");
        return;
      }

      const fileName = editedTransaction.CustomerName
        ? `إيصال-${editedTransaction.CustomerName}.pdf`
        : `إيصال.pdf`;

      const pdfUrl = URL.createObjectURL(pdfBlob);
      const emailSubject = `إيصال ${typeLabels[editedTransaction.type]}`;
      const emailBody = `إيصال ${typeLabels[editedTransaction.type]
        } - المبلغ: ${formatNumber(editedTransaction.amount)} ${editedTransaction.currency
        }\n\nمرفق إيصال ${typeLabels[editedTransaction.type]}`;

      downloadFile(pdfUrl, fileName);
      setTimeout(() => {
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(
          emailSubject
        )}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoUrl;
      }, 1000);
    } catch (error) {
      console.error("Error in email share process:", error);
      alert("حدث خطأ أثناء مشاركة الإيصال");
    } finally {
      setIsSharing(false);
    }
  };

  const shareViaOther = async () => {
    setIsSharing(true);
    setShowShareOptions(false);

    try {
      const pdfBlob = await generatePDFBlob();
      if (!pdfBlob) {
        alert("حدث خطأ أثناء إنشاء ملف PDF للمشاركة");
        return;
      }

      const fileName = editedTransaction.CustomerName
        ? `إيصال-${editedTransaction.CustomerName}.pdf`
        : `إيصال.pdf`;

      const pdfFile = new File([pdfBlob], fileName, {
        type: "application/pdf",
        lastModified: Date.now(),
      });

      const shareData = {
        title: `إيصال ${typeLabels[editedTransaction.type]}`,
        text: `إيصال ${typeLabels[editedTransaction.type]
          } - المبلغ: ${formatNumber(editedTransaction.amount)} ${editedTransaction.currency
          }`,
        files: [pdfFile],
      };

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare(shareData)
      ) {
        try {
          await navigator.share(shareData);
          alert("تم مشاركة الإيصال بنجاح!");
        } catch (shareError: any) {
          if (shareError.name !== "AbortError") {
            console.error("Error sharing:", shareError);
            await fallbackDownload(pdfBlob, fileName);
          }
        }
      } else {
        await fallbackDownload(pdfBlob, fileName);
      }
    } catch (error) {
      console.error("Error in share process:", error);
      alert("حدث خطأ أثناء مشاركة الإيصال");
    } finally {
      setIsSharing(false);
    }
  };

  const downloadFile = (url: string, fileName: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fallbackDownload = async (pdfBlob: Blob, fileName: string) => {
    const url = URL.createObjectURL(pdfBlob);
    downloadFile(url, fileName);
    alert("تم تحميل الإيصال - يمكنك مشاركته من مجلد التحميلات");
  };

  const getFooterText = () => {
    const currentDate = format(new Date(), "dd/MM/yyyy, hh:mm a", {
      locale: ar,
    });
    const englishDate = toEnglishNumbers(currentDate);

    switch (editedTransaction.type) {
      case "entry":
        return `تم إنشاء إيصال دخول في ${englishDate}`;
      case "exit":
        return `تم إنشاء إيصال خروج في ${englishDate}`;
      case "sell_to":
        return `تم إنشاء إيصال بيع في ${englishDate}`;
      case "buy":
        return `تم إنشاء إيصال شراء في ${englishDate}`;
      default:
        return `تم إنشاء هذا الإيصال في ${englishDate}`;
    }
  };

  // Simple Field component
  const Field = ({
    label,
    children,
    className = "",
  }: {
    label: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={`flex flex-col ${className}`}>
      <label className="text-right text-[#212E5B] font-medium mb-2 text-sm">
        {label}
      </label>
      <div className="border-b border-[#212E5B] pb-1">{children}</div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-">
      {/* Share Options Modal */}
      {showShareOptions && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center"
          onClick={() => setShowShareOptions(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-center mb-4 text-[#212E5B]">
              مشاركة الإيصال
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                icon={MessageCircle}
                onClick={shareViaWhatsApp}
                className="w-full justify-center hover:bg-green-50 hover:text-green-600"
                size="sm"
              >
                مشاركة عبر واتساب
              </Button>
              <Button
                variant="outline"
                icon={Mail}
                onClick={shareViaEmail}
                className="w-full justify-center hover:bg-blue-50 hover:text-blue-600"
                size="sm"
              >
                مشاركة عبر البريد الإلكتروني
              </Button>
              <Button
                variant="outline"
                icon={Share2}
                onClick={shareViaOther}
                className="w-full justify-center hover:bg-purple-50 hover:text-purple-600"
                size="sm"
              >
                مشاركة عبر التطبيقات الأخرى
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowShareOptions(false)}
                className="w-full justify-center hover:bg-gray-50"
                size="sm"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col mx-2"
      >
        {/* Action Buttons */}
        <div className="sticky top-0 bg-white/98 backdrop-blur-sm border-b border-gray-200 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 z-20 shadow-sm">
          <div className="flex flex-wrap gap-2 sm:gap-3 rtl:space-x-reverse w-full sm:w-auto">
            <Button
              variant="primary"
              icon={Download}
              onClick={generatePDF}
              loading={isGenerating}
              disabled={isGenerating || isSharing || isEditing}
              size="sm"
              className="flex-1 sm:flex-none min-w-[120px]"
            >
              {isGenerating ? "جاري الإنشاء..." : "تحميل PDF"}
            </Button>
            <Button
              variant="outline"
              icon={Printer}
              onClick={handlePrint}
              disabled={isGenerating || isSharing || isEditing}
              size="sm"
              className="flex-1 sm:flex-none min-w-[100px]"
            >
              طباعة
            </Button>
            <Button
              variant="outline"
              icon={Share2}
              onClick={handleShare}
              loading={isSharing}
              disabled={isGenerating || isSharing || isEditing}
              size="sm"
              className="flex-1 sm:flex-none min-w-[100px]"
            >
              {isSharing ? "جاري المشاركة..." : "مشاركة"}
            </Button>
            {onEdit && !isEditing && (
              <Button
                variant="outline"
                icon={Edit}
                onClick={handleEdit}
                disabled={isGenerating || isSharing}
                size="sm"
                className="flex-1 sm:flex-none min-w-[100px] hover:bg-green-50 hover:text-green-600"
              >
                تعديل
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  variant="primary"
                  icon={Save}
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={isSaving}
                  size="sm"
                  className="flex-1 sm:flex-none min-w-[100px] hover:bg-green-600"
                >
                  حفظ
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  size="sm"
                  className="flex-1 sm:flex-none min-w-[100px] hover:bg-gray-50"
                >
                  إلغاء
                </Button>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            icon={X}
            onClick={handleClose}
            disabled={isSaving}
            size="sm"
            className="sm:self-center hover:bg-red-50 hover:text-red-600 w-full sm:w-auto justify-center"
          >
            إغلاق
          </Button>
        </div>

        {/* Invoice Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <div className="flex justify-center">
            <div className="w-full max-w-none overflow-x-auto">
              <div className="flex justify-center min-w-[794px]">
                <div
                  ref={invoiceRef}
                  className="bg-white shadow-lg"
                  style={{
                    width: "100%",
                    maxWidth: "794px",
                    minHeight: "800px",
                    margin: "0 auto",
                    padding: "0",
                    fontFamily: "'Tajawal', sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {/* Header */}
                  <div className="relative overflow-hidden">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: "url('/bg.png')",
                        backgroundRepeat: "repeat-y",
                        backgroundSize: "100% 120%",
                        backgroundPosition: "top left",
                      }}
                    ></div>
                    <div className="relative z-10 text-center py-8 px-12">
                      <div className="mb-6">
                        <div className="w-40 h-40  mx-auto mb-3">
                          <img
                            src="/applogo.png"
                            alt="App Logo"
                            className="w-full h-full object-contain"
                            crossOrigin="anonymous"
                            style={{
                              maxWidth: "100%",
                              height: "auto",
                              display: "block",
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = "none";
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-center mb-8">
                        <div
                          className="rounded-full px-6 py-2  bg-[#212E5B] text-white text-lg font-bold mb-4"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {typeLabels[editedTransaction.type]}
                        </div>
                      </div>
                      <div className="text-gray-600">
                        <p className="text-sm text-[#212E5B]">
                          التاريخ:{" "}
                          {toEnglishNumbers(
                            format(
                              new Date(editedTransaction.created_at),
                              "PPP",
                              { locale: ar }
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div
                    className="px-12 py-4"
                    // style={{
                    //   direction: "rtl",
                    //   textAlign: "right",
                    //   WebkitTextSizeAdjust: "100%",
                    //   textSizeAdjust: "100%",
                    //   WebkitFontSmoothing: "antialiased",
                    //   maxWidth: "100%",
                    //   width: "100%",
                    //   overflow: "hidden",
                    //   zoom: 1,
                    //   transform: "scale(1)",
                    /// }}
                  >
                    {/* Transaction Details */}
                    <div className="bg-[#212E5B]/5 rounded-2xl p-6 mb-6 border border-[#212E5B]">
                      <div className="sspace-y-6">

                        {/* Customer Information */}
                        {(editedTransaction.type === "sell_to" ||
                          editedTransaction.type === "buy" ||
                          editedTransaction.CustomerName ||
                          editedTransaction.deliver_to) && (
                            <div className="grid grid-cols-2 gap-6">


                              <Field label="العميل:">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    defaultValue={
                                      getInputValue("CustomerName") || ""
                                    }
                                    onChange={handleTextChange("CustomerName")}
                                    className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                                    placeholder="أدخل اسم العميل"
                                  />
                                ) : (
                                  <span className="text-gray-900 font-semibold text-sm">
                                    {editedTransaction.CustomerName ||
                                      "لم يتم إضافة اسم العميل"}
                                  </span>
                                )}
                              </Field>

                              {/* السعر */}
                              {(editedTransaction.type === "sell_to" || editedTransaction.type === "buy") && (
                                <Field label="السعر:">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      step="0.01"
                                      defaultValue={getInputValue("rate") || 0}
                                      onChange={handleNumberChange("rate")}
                                      className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                                    />
                                  ) : (
                                    <span className="text-gray-900 font-semibold text-sm">
                                      {formatNumber(Number(editedTransaction.rate ?? 0))}
                                    </span>
                                  )}
                                </Field>
                              )}




                              {editedTransaction.type === "exit" && (
                                <>
                                  {isEditing ? (
                                    <>
                                      <Field label="من حساب:">
                                        <input
                                          type="text"
                                          defaultValue={
                                            getInputValue("from_account_name") ||
                                            ""
                                          }
                                          onChange={handleTextChange(
                                            "from_account_name"
                                          )}
                                          className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                                        />
                                      </Field>
                                      <Field label="تسليم الى:">
                                        <input
                                          type="text"
                                          defaultValue={
                                            getInputValue("deliver_to") || ""
                                          }
                                          onChange={handleTextChange(
                                            "deliver_to"
                                          )}
                                          className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                                        />
                                      </Field>
                                    </>
                                  ) : (
                                    <>
                                      {editedTransaction.from_account_name && (
                                        <Field label="من حساب:">
                                          <span className="text-gray-900 font-semibold text-sm">
                                            {editedTransaction.from_account_name}
                                          </span>
                                        </Field>
                                      )}
                                      {editedTransaction.deliver_to && (
                                        <Field label="تسليم الى:">
                                          <span className="text-gray-900 font-semibold text-sm">
                                            {editedTransaction.deliver_to}
                                          </span>
                                        </Field>
                                      )}
                                    </>
                                  )}
                                </>
                              )}


                              {/* Entry/Exit Specific Fields */}
                              {(editedTransaction.type === "entry" ||
                                editedTransaction.type === "exit") && (
                                  <div >
                                    {editedTransaction.type === "entry" && (
                                      <>
                                        {isEditing ? (
                                          <>
                                            <Field label=" حساب:">
                                              <input
                                                type="text"
                                                defaultValue={
                                                  getInputValue("to_account_name") || ""
                                                }
                                                onChange={handleTextChange(
                                                  "to_account_name"
                                                )}
                                                className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                                              />
                                            </Field>
                                            <Field label="استلمت من:">
                                              <input
                                                type="text"
                                                defaultValue={
                                                  getInputValue("deliver_to") || ""
                                                }
                                                onChange={handleTextChange(
                                                  "deliver_to"
                                                )}
                                                className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                                              />
                                            </Field>
                                          </>
                                        ) : (
                                          <>
                                            {/* {editedTransaction.to_account_name && (
                                        <Field label="في حساب:">
                                          <span className="text-gray-900 font-semibold text-sm">
                                            {editedTransaction.to_account_name}
                                          </span>
                                        </Field>
                                      )} */}
                                            {editedTransaction.deliver_to && (
                                              <Field label="استلمت من:">
                                                <span className="text-gray-900 font-semibold text-sm">
                                                  {editedTransaction.deliver_to}
                                                </span>
                                              </Field>
                                            )}
                                          </>
                                        )}
                                      </>
                                    )}

                                  </div>
                                )}

                            </div>
                          )}

                        <br />

                        {/* Transaction Fields */}
                        <div className="grid grid-cols-2 gap-6">

                          <Field label="البلد/المدينة:">
                            {isEditing ? (
                              <input
                                type="text"
                                defaultValue={getInputValue("country_city")}
                                onChange={handleTextChange("country_city")}
                                className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                              />
                            ) : (
                              <span className="text-gray-900 font-semibold text-sm">
                                {editedTransaction.country_city}
                              </span>
                            )}
                          </Field>

                          {(editedTransaction.type === "entry" ||
                            editedTransaction.type === "exit") && (
                              <Field label="المبلغ:">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    defaultValue={getInputValue("amount")}
                                    onChange={handleNumberChange("amount")}
                                    className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                                  />
                                ) : (
                                  <span className="text-gray-900 font-semibold text-sm">
                                    {formatNumber(editedTransaction.amount)}{" "}
                                    {editedTransaction.currency}
                                  </span>
                                )}
                              </Field>
                            )}

                          {editedTransaction.type === "sell_to" && (
                            <Field label="المبلغ الأساسي:">
                              {isEditing ? (
                                <input
                                  type="number"
                                  defaultValue={getInputValue("price")}
                                  onChange={handleNumberChange("price")}
                                  className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                                />
                              ) : (
                                <span className="text-gray-900 font-semibold text-sm">
                                  {formatNumber(editedTransaction.price)}{" "}
                                  {editedTransaction.currency}
                                </span>
                              )}
                            </Field>
                          )}



                          {editedTransaction.type === "buy" && (
                            <Field label="المبلغ الأساسي:">
                              {isEditing ? (
                                <input
                                  type="number"
                                  defaultValue={getInputValue("price")}
                                  onChange={handleNumberChange("price")}
                                  className="w-full bg-transparent border-none outline-none text-gray-900 font-semibold text-sm"
                                />
                              ) : (
                                <span className="text-gray-900 font-semibold text-sm">
                                  {formatNumber(editedTransaction.price)}{" "}
                                  {editedTransaction.currency}
                                </span>
                              )}
                            </Field>
                          )}

                        </div>
                        <br />



                      </div>
                    </div>


                    {/* Total Amount */}
                    {(editedTransaction.type === "buy" || editedTransaction.type === "sell_to") && (
                      <div className="mb-6 text-[#212E5B] text-sm font-bold text-right">
                        * المبلغ: {formatNumber(getTotalAmount())} {editedTransaction.currency_final ?? "الدينار الليبي"}
                      </div>
                    )}


                    {/* Notes Section */}
                    {isEditing ? (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-[#212E5B] font-medium text-sm">
                            ملاحظة:
                          </label>
                          <button
                            type="button"
                            onClick={toggleNotes}
                            className="text-red-500 hover:text-red-700 text-sm font-medium"
                          >
                            {showNotes ? "إخفاء الملاحظة" : "إظهار الملاحظة"}
                          </button>
                        </div>
                        {showNotes && (
                          <div className="bg-[#212E5B]/5 border border-[#212E5B] rounded-xl p-4">
                            <textarea
                              defaultValue={getInputValue("notes") || ""}
                              onChange={handleTextChange("notes")}
                              className="w-full bg-transparent border-none outline-none text-gray-800 leading-relaxed text-sm resize-none"
                              rows={3}
                              placeholder="أدخل ملاحظة..."
                            />
                          </div>
                        )}
                      </div>
                    ) : hasValidNotes ? (
                      <div className="mb-6">
                        <label className="block text-[#212E5B] font-medium mb-2 text-sm">
                          ملاحظة:
                        </label>
                        <div className="bg-[#212E5B]/5 border border-[#212E5B] rounded-xl p-4">
                          <p className="text-gray-800 leading-relaxed text-sm">
                            {editedTransaction.notes}
                          </p>
                        </div>
                      </div>
                    ) : null}


                  </div>

                  {/* Footer */}
                  <div className="relative text-center py-6 mt-6 overflow-hidden">
                    <div className="relative z-10 mb-16 px-4">
                      <p className="text-[#212E5B] mb-3 text-lg font-semibold">
                        نعيد تعريف الصرافه خطوة بخطوة
                      </p>
                      <p className="text-md text-[#212E5B]/90">
                        {getFooterText()}
                      </p>
                    </div>
                    <div
                      className="absolute left-0 right-0 bottom-0 z-0"
                      style={{
                        backgroundImage: "url('/bg2.png')",
                        backgroundRepeat: "no-repeat",
                        backgroundSize: "cover",
                        backgroundPosition: "center bottom",
                        height: "150px",
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>






      </div>
    </div>
  );
}