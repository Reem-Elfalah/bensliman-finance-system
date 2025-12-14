import React from "react";
import CustomerSelect from "./CustomerSelect";

interface CustomerStepProps {
  selectedCustomer: string | null;                  
  onSelectCustomer: (customerId: string) => void;  
}

export default function CustomerStep({
  selectedCustomer,
  onSelectCustomer,
}: CustomerStepProps) {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        إختر العميل
      </h2>

      {/* Customer select dropdown */}
      <CustomerSelect onSelect={onSelectCustomer} />

      {/* Optional: show currently selected customer */}
      {selectedCustomer && (
        <p className="mt-2 text-gray-600">
          العميل المختار: {selectedCustomer}
        </p>
      )}
    </div>
  );
}
