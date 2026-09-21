"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { displayDateInput, shiftDateInput, timeSlots, todayInput } from "@/lib/datetime";
import "./date-time-fields.css";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const SHORTCUTS: [number, string][] = [[0, "Hoje"], [1, "Amanhã"], [2, "+ 2 dias"], [7, "Próxima semana"]];
const DEFAULT_SLOTS = timeSlots(7, 20);

function monthLabel(month: Date) {
  const text = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Brazilian date field: visual calendar, DD/MM/AAAA display and quick shortcuts.
 * The value it produces is always "YYYY-MM-DD", read back on the server in the operation timezone.
 */
export function DateField({
  value, onChange, label = "Data", name, required = false, hint, shortcuts = true, min,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  name?: string;
  required?: boolean;
  hint?: string;
  shortcuts?: boolean;
  min?: string;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const [year, monthNumber] = (value || todayInput()).split("-").map(Number);
    return new Date(year, (monthNumber || 1) - 1, 1);
  });
  const container = useRef<HTMLDivElement>(null);
  const id = useId();
  const today = todayInput();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function choose(next: string) {
    onChange(next);
    const [year, monthNumber] = next.split("-").map(Number);
    setMonth(new Date(year, monthNumber - 1, 1));
    setOpen(false);
  }

  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  return (
    <div className="field-date" ref={container} onKeyDown={(event) => { if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); } }}>
      <span className="field-label" id={`${id}-label`}>{label}{required ? " *" : null}</span>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        type="button"
        className="field-date-trigger"
        aria-labelledby={`${id}-label`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={value ? "" : "is-placeholder"}>{value ? displayDateInput(value) : "DD/MM/AAAA"}</span>
        <CalendarDays size={16} aria-hidden="true" />
      </button>
      {open ? (
        <div className="field-calendar" role="dialog" aria-label={`Escolher ${label.toLowerCase()}`}>
          <header>
            <button type="button" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft /></button>
            <strong>{monthLabel(month)}</strong>
            <button type="button" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight /></button>
          </header>
          <div className="field-calendar-grid">
            {WEEKDAYS.map((day) => <small key={day}>{day}</small>)}
            {Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}
            {Array.from({ length: days }, (_, index) => {
              const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
              return (
                <button
                  type="button"
                  key={key}
                  className={key === today ? "is-today" : ""}
                  disabled={!!min && key < min}
                  aria-label={displayDateInput(key)}
                  aria-pressed={value === key}
                  onClick={() => choose(key)}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <label className="field-calendar-manual">
            Digitar data
            <input type="date" value={value} min={min} onChange={(event) => event.target.value && choose(event.target.value)} />
          </label>
        </div>
      ) : null}
      {shortcuts ? (
        <div className="field-shortcuts">
          {SHORTCUTS.map(([days_, text]) => (
            <button type="button" key={text} onClick={() => choose(shiftDateInput(today, days_))}>{text}</button>
          ))}
        </div>
      ) : null}
      {hint ? <small className="field-hint">{hint}</small> : null}
    </div>
  );
}

/**
 * Time field with 30-minute slots — no manual ":" typing — plus a custom time escape hatch.
 * Always 24h ("14:30").
 */
export function TimeField({
  value, onChange, label = "Horário", name, required = false, hint, slots = DEFAULT_SLOTS,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  name?: string;
  required?: boolean;
  hint?: string;
  slots?: string[];
}) {
  const [custom, setCustom] = useState(() => !!value && !slots.includes(value));
  const id = useId();
  return (
    <div className="field-time">
      <label className="field-label" htmlFor={id}>{label}{required ? " *" : null}</label>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {custom ? (
        <input
          id={id}
          type="time"
          step={300}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => { if (!value) setCustom(false); }}
        />
      ) : (
        <select
          id={id}
          required={required}
          value={value}
          onChange={(event) => {
            if (event.target.value === "__custom__") { setCustom(true); return; }
            onChange(event.target.value);
          }}
        >
          <option value="">Selecione</option>
          {slots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
          <option value="__custom__">Outro horário…</option>
        </select>
      )}
      {custom ? <button type="button" className="field-link-button" onClick={() => setCustom(false)}>Usar horários sugeridos</button> : null}
      {hint ? <small className="field-hint">{hint}</small> : null}
    </div>
  );
}

/**
 * Self-contained date + time field for plain forms. Submits one hidden input with the
 * wall-clock value ("2026-09-22T14:00"), which the server reads in the operation timezone.
 */
export function DateTimeField({
  name, defaultValue = "", dateLabel = "Data", timeLabel = "Horário", required = false, hint, defaultTime = "09:00", className = "",
}: {
  name: string;
  defaultValue?: string;
  dateLabel?: string;
  timeLabel?: string;
  required?: boolean;
  hint?: string;
  defaultTime?: string;
  className?: string;
}) {
  const [date, setDate] = useState(defaultValue.slice(0, 10));
  const [time, setTime] = useState(defaultValue.slice(11, 16) || defaultTime);
  return (
    <div className={`field-datetime ${className}`.trim()}>
      <input type="hidden" name={name} value={date && time ? `${date}T${time}` : ""} />
      <DateField label={dateLabel} value={date} onChange={setDate} required={required} />
      <TimeField label={timeLabel} value={time} onChange={setTime} required={required} hint={hint} />
    </div>
  );
}

/** Self-contained date-only field for plain forms (deadlines, closing dates). */
export function DateInputField({
  name, defaultValue = "", label = "Data", required = false, hint, shortcuts = true, className = "",
}: {
  name: string;
  defaultValue?: string;
  label?: string;
  required?: boolean;
  hint?: string;
  shortcuts?: boolean;
  className?: string;
}) {
  const [date, setDate] = useState(defaultValue.slice(0, 10));
  return (
    <div className={`field-date-single ${className}`.trim()}>
      <DateField label={label} value={date} onChange={setDate} name={name} required={required} hint={hint} shortcuts={shortcuts} />
    </div>
  );
}
