import React, { ReactNode, useState } from "react";
import Tooltip from "./Tooltip";

type Props = {
  title: string;
  context?: string;
  children: ReactNode;
};

export default function SmartTooltip({ title, context = "", children }: Props) {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const ensureText = async () => {
    if (text || loading) return;
    setLoading(true);
    try {
      const resp = await fetch("http://localhost:4000/api/assist/describe-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: title, context }),
      });
      const data = await resp.json();
      if (data.description) {
        setText(data.description);
      }
    } catch {
      setText("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip
      label={
        <div className="space-y-1">
          <div className="font-semibold text-gray-800">{title}</div>
          <div className="text-xs text-gray-700 min-h-[20px]">
            {loading ? "Генерируем подсказку..." : text || "Наведите, чтобы получить описание от ИИ"}
          </div>
        </div>
      }
    >
      <span onMouseEnter={ensureText}>{children}</span>
    </Tooltip>
  );
}

