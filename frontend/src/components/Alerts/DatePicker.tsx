import React, { useState, forwardRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import calendar from "../../assets/icons/calendar.svg";
interface DatePickerProps {
  selected?: Date | null;
  onChange?: (date: Date | null) => void;
}

export default function TailwindDatepicker({ selected, onChange }: DatePickerProps) {
  const [internalDate, setInternalDate] = useState<Date | null>(null);

  const handleChange = (date: Date | null) => {
    setInternalDate(date);
    if (onChange) onChange(date);
  };

  // Custom input to wrap the SVG inside a div
  const CustomInput = forwardRef<
    HTMLDivElement,
    { value?: string; onClick?: () => void }
  >(({ value, onClick }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      className="w-auto h-10 px-3 py-2 rounded-md border border-[rgba(224,224,224,1)] bg-white flex items-center justify-center cursor-pointer min-w-[40px]"
    >
      <img src={calendar} alt="" />
      {value && <span className="ml-2 text-sm text-[rgba(28,32,36,1)]">{value}</span>}
    </div>
  ));

  CustomInput.displayName = "CustomInput";

  return (
    <div className="inline-block">
      <DatePicker
        selected={selected !== undefined ? selected : internalDate}
        onChange={handleChange}
        customInput={<CustomInput />}
        popperClassName="tailwind-datepicker"
      />
    </div>
  );
}
