"use client";

import { useEffect, useRef, useState } from "react";

function normalizeMoneyText(text: string) {
  const cleaned = text.replace(/[^\d.,]/g, "");
  if (!cleaned) return "";

  if (cleaned.includes(",")) {
    const [whole, ...fractionParts] = cleaned.split(",");
    const fraction = fractionParts.join("").replace(/\D/g, "").slice(0, 2);
    const integer = whole.replace(/\D/g, "") || "0";
    return fraction ? `${Number(integer)}.${fraction}` : String(Number(integer));
  }

  const dots = cleaned.match(/\./g)?.length || 0;
  if (dots === 1) {
    const [whole, fraction = ""] = cleaned.split(".");
    if (fraction.length <= 2) {
      const integer = whole.replace(/\D/g, "") || "0";
      const decimal = fraction.replace(/\D/g, "").slice(0, 2);
      return decimal ? `${Number(integer)}.${decimal}` : String(Number(integer));
    }
  }

  const integer = cleaned.replace(/\D/g, "");
  return integer ? String(Number(integer)) : "";
}

function editText(raw: string) {
  return raw ? raw.replace(".", ",") : "";
}

function formattedText(raw: string) {
  if (!raw) return "";
  const number = Number(raw);
  if (!Number.isFinite(number)) return "";
  return number.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function MoneyInput({
  name,
  value,
  defaultValue = "",
  onValueChange,
  required = false,
  disabled = false,
  placeholder = "0,00",
  id,
  ariaLabel,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(() => normalizeMoneyText(defaultValue));
  const raw = controlled ? normalizeMoneyText(value || "") : internal;
  const focused = useRef(false);
  const [display, setDisplay] = useState(() => formattedText(raw));

  useEffect(() => {
    if (!focused.current) setDisplay(formattedText(raw));
  }, [raw]);

  function commit(nextText: string) {
    const next = normalizeMoneyText(nextText);
    if (!controlled) setInternal(next);
    onValueChange?.(next);
    setDisplay(nextText);
  }

  return (
    <span className="admin-money-input">
      <b>R$</b>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={display}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={() => {
          focused.current = true;
          setDisplay(editText(raw));
        }}
        onChange={(event) => commit(event.target.value)}
        onBlur={() => {
          focused.current = false;
          setDisplay(formattedText(raw));
        }}
      />
      {name ? <input type="hidden" name={name} value={raw} /> : null}
    </span>
  );
}
