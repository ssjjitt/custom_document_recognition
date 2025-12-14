import React, { ReactNode, useState } from "react";

type Props = {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
};

export default function Tooltip({ label, children, align = "left" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          className={`absolute z-50 w-64 px-3 py-2 text-xs text-gray-800 bg-white border border-gray-200 rounded shadow-lg ${align === "right" ? "right-0" : "left-0"} top-full mt-2`}
        >
          {label}
        </div>
      )}
    </span>
  );
}

