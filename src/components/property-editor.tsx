"use client";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Loader2,
  Minus,
  Plus,
  Pencil,
  Building2,
} from "lucide-react";
import {
  startTransition,
  useActionState,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { saveProperty } from "@/app/painel/imoveis/actions";
import {
  propertyErrors,
  propertyRecordId,
  propertySlug,
  propertySteps,
} from "@/lib/property-wizard";
import "./property-wizard.css";
import { PropertyMediaManager } from "./property-media-manager";

type Values = Record<string, string>;
const statuses: Values = {
  rascunho: "Rascunho",
  disponivel: "Disponível",
  pausado: "Pausado",
  reservado: "Reservado",
};

function Field({
  name,
  label,
  values,
  change,
  errors,
  type = "text",
  optional = false,
  hint,
  ...props
}: {
  name: string;
  label: string;
  values: Values;
  change: (name: string, value: string) => void;
  errors: Values;
  type?: string;
  optional?: boolean;
  hint?: string;
  min?: number;
  max?: number;
  step?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <label className="wizard-field" htmlFor={name}>
      <span>
        {label}
        {optional ? <small> (opcional)</small> : null}
      </span>
      <input
        id={name}
        type={type}
        value={values[name] || ""}
        onChange={(e) => change(name, e.target.value)}
        required={!optional}
        aria-invalid={!!errors[name]}
        aria-describedby={
          errors[name] ? name + "-error" : hint ? name + "-hint" : undefined
        }
        {...props}
      />
      {hint ? <small id={name + "-hint"}>{hint}</small> : null}
      {errors[name] ? (
        <small id={name + "-error"} className="wizard-error">
          {errors[name]}
        </small>
      ) : null}
    </label>
  );
}
function SummaryBlock({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="wizard-summary-block">
      <header>
        <h3>{title}</h3>
        <button type="button" onClick={onEdit} aria-label={"Editar " + title}>
          <Pencil size={14} /> Editar
        </button>
      </header>
      {children}
    </section>
  );
}
export function PropertyEditor({
  initial = {},
  owners = [],
  photos = [],
  documents = [],
}: {
  initial?: Record<string, string | number>;
  owners?: { id: string; name: string }[];
  photos?: { id: string; alt: string; position: number; isCover: boolean }[];
  documents?: { id: string; originalName: string; mime: string; size: number }[];
}) {
  const [state, action, pending] = useActionState(saveProperty, { error: "", id: String(initial.id || "") });
  const [values, setValues] = useState<Values>(() => ({
    title: "",
    code: "",
    slug: "",
    price: "",
    area: "",
    bedrooms: "0",
    bathrooms: "0",
    parking: "0",
    type: "Apartamento",
    status: "rascunho",
    state: "",
    city: "",
    neighborhood: "",
    address: "",
    description: "",
    features: "",
    ownerId: "",
    ownerName: "",
    ownerPhone: "",
    ownerEmail: "",
    ...Object.fromEntries(
      Object.entries(initial).map(([key, value]) => [key, String(value)]),
    ),
  }));
  const [step, setStep] = useState(0),
    [visited, setVisited] = useState<number[]>(initial.id ? [0, 1, 2, 3] : []);
  const [errors, setErrors] = useState<Values>({});
  const [manualSlug, setManualSlug] = useState(!!initial.id),
    [advanced, setAdvanced] = useState(false),
    [ownerOpen, setOwnerOpen] = useState(false);
  const [saveHint, setSaveHint] = useState("");
  const propertyId = propertyRecordId(state.id, initial.id);
  const heading = useRef<HTMLHeadingElement>(null);
  const editing = !!initial.id;
  function change(name: string, value: string) {
    setValues((old) => ({
      ...old,
      [name]: value,
      ...(name === "title" && !manualSlug ? { slug: propertySlug(value) } : {}),
    }));
    setErrors((old) => {
      const next = { ...old };
      delete next[name];
      if (name === "title" && !manualSlug) delete next.slug;
      return next;
    });
    setSaveHint("");
  }
  function go(next: number, focusField?: string) {
    setStep(next);
    setVisited((old) => [...new Set([...old, next])]);
    requestAnimationFrame(() => {
      heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
      if (focusField) document.getElementById(focusField)?.focus();
      else heading.current?.focus({ preventScroll: true });
    });
  }
  function validate(current?: number) {
    const found = propertyErrors(values, current);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      if (first === "slug") setAdvanced(true);
      if (first.startsWith("owner")) setOwnerOpen(true);
      go(
        propertySteps.findIndex((s) => s.fields.includes(first)),
        first,
      );
      return false;
    }
    return true;
  }
  function next() {
    if (!validate(step)) return;
    setVisited((old) => [...new Set([...old, step])]);
    go(Math.min(step + 1, 5));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const intent = (event.nativeEvent as SubmitEvent).submitter?.getAttribute(
      "value",
    );
    if (intent !== "draft" && step !== 5) {
      next();
      return;
    }
    if (!validate()) {
      setSaveHint(
        "Complete os campos obrigatórios indicados para salvar no banco. Seus dados continuam neste formulário.",
      );
      return;
    }
    const data = new FormData();
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    data.set("id", propertyId);
    data.set("status", intent === "draft" ? "rascunho" : values.status);
    data.set("intent", intent || "save");
    if (values.ownerId)
      for (const key of ["ownerName", "ownerPhone", "ownerEmail"])
        data.set(key, "");
    startTransition(() => action(data));
  }
  const field = (
    name: string,
    label: string,
    props: Partial<Parameters<typeof Field>[0]> = {},
  ) => (
    <Field
      name={name}
      label={label}
      values={values}
      change={change}
      errors={errors}
      {...props}
    />
  );
  const ownerName =
    owners.find((o) => o.id === values.ownerId)?.name ||
    values.ownerName ||
    "Não informado";
  return (
    <form
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
          if (!pending && step < 5) next();
        }
      }}
      noValidate
      className="property-editor property-wizard"
    >
      <div className="wizard-mobile-progress">
        <span>
          Etapa {step + 1} de 6 <strong>{propertySteps[step].title}</strong>
        </span>
        <progress aria-label="Progresso do cadastro" value={step + 1} max={6} />
      </div>
      <div className="wizard-layout">
        <nav className="wizard-nav" aria-label="Etapas do cadastro">
          <ol>
            {propertySteps.map((item, index) => {
              const complete =
                visited.includes(index) &&
                index < 4 &&
                Object.keys(propertyErrors(values, index)).length === 0;
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    disabled={
                      pending ||
                      (!editing && index > step && !visited.includes(index))
                    }
                    aria-current={step === index ? "step" : undefined}
                    onClick={() => go(index)}
                  >
                    <span className={complete ? "complete" : ""}>
                      {complete ? (
                        <Check size={16} />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      {item.title}
                      <small>
                        {step === index
                          ? "Você está aqui"
                          : complete
                            ? "Concluída"
                            : index === 4
                              ? "Armazenamento pendente"
                              : "Pendente"}
                      </small>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
          <p>Seus dados são mantidos ao avançar e voltar.</p>
        </nav>
        <div className="wizard-body">
          <header className="wizard-heading">
            <span>ETAPA {String(step + 1).padStart(2, "0")} / 06</span>
            <h2 ref={heading} tabIndex={-1}>
              {propertySteps[step].heading}
            </h2>
            <p>{propertySteps[step].hint}</p>
          </header>
          <fieldset disabled={pending} className="wizard-fields" key={step}>
            {step === 0 ? (
              <>
                {field("title", "Título do imóvel", {
                  maxLength: 180,
                  placeholder: "Ex.: Casa com jardim no Santa Mônica",
                })}
                <div className="wizard-grid">
                  <label className="wizard-field" htmlFor="type">
                    <span>Tipo de imóvel</span>
                    <select
                      id="type"
                      value={values.type}
                      onChange={(e) => change("type", e.target.value)}
                    >
                      {["Apartamento", "Casa", "Cobertura", "Studio"].map(
                        (type) => (
                          <option key={type}>{type}</option>
                        ),
                      )}
                    </select>
                  </label>
                  {field("price", "Preço de venda (R$)", {
                    type: "number",
                    min: 0.01,
                    max: 21474836.47,
                    step: "0.01",
                    placeholder: "450000",
                  })}
                  <label className="wizard-field" htmlFor="status">
                    <span>Status</span>
                    <select
                      id="status"
                      value={values.status}
                      onChange={(e) => change("status", e.target.value)}
                    >
                      {Object.entries(statuses).map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                    <small>
                      Somente “Disponível” aparece no site após salvar.
                    </small>
                  </label>
                  {field("code", "Código interno", {
                    maxLength: 30,
                    placeholder: "AV-001",
                  })}
                </div>
                <details
                  open={ownerOpen}
                  onToggle={(e) => setOwnerOpen(e.currentTarget.open)}
                  className="wizard-details"
                >
                  <summary>
                    Proprietário{" "}
                    <small>
                      {initial.ownerNames ? "Já vinculado" : "(opcional)"}
                    </small>
                  </summary>
                  {initial.ownerNames ? (
                    <p>
                      Já vinculados: {initial.ownerNames}. Você pode acrescentar
                      outro proprietário.
                    </p>
                  ) : null}
                  <label className="wizard-field" htmlFor="ownerId">
                    <span>Selecionar proprietário</span>
                    <select
                      id="ownerId"
                      value={values.ownerId}
                      onChange={(e) => change("ownerId", e.target.value)}
                    >
                      <option value="">Cadastrar pelo nome</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!values.ownerId ? (
                    <div className="wizard-grid">
                      {field("ownerName", "Nome", {
                        optional: true,
                        maxLength: 160,
                      })}
                      {field("ownerPhone", "Telefone", {
                        optional: true,
                        maxLength: 30,
                        type: "tel",
                      })}
                      {field("ownerEmail", "E-mail", {
                        optional: true,
                        type: "email",
                        maxLength: 254,
                      })}
                    </div>
                  ) : null}
                  <p>O proprietário será vinculado ao imóvel ao salvar.</p>
                </details>
                <details
                  open={advanced}
                  onToggle={(e) => setAdvanced(e.currentTarget.open)}
                  className="wizard-details"
                >
                  <summary>Opções avançadas</summary>
                  <Field
                    name="slug"
                    label="Endereço da página"
                    values={values}
                    errors={errors}
                    change={(name, value) => {
                      setManualSlug(true);
                      change(name, value);
                    }}
                    maxLength={200}
                    hint="Gerado pelo título para novos imóveis. Alterar um endereço existente pode invalidar links compartilhados."
                  />
                </details>
              </>
            ) : null}
            {step === 1 ? (
              <>
                <div className="wizard-counts">
                  {[
                    ["bedrooms", "Quartos"],
                    ["bathrooms", "Banheiros"],
                    ["parking", "Vagas"],
                  ].map(([name, label]) => (
                    <div className="wizard-counter" key={name}>
                      <label htmlFor={name}>{label}</label>
                      <div>
                        <button
                          type="button"
                          aria-label={"Diminuir " + label.toLowerCase()}
                          disabled={Number(values[name]) <= 0}
                          onClick={() =>
                            change(
                              name,
                              String(Math.max(0, Number(values[name]) - 1)),
                            )
                          }
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          id={name}
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          value={values[name]}
                          onChange={(e) => change(name, e.target.value)}
                          aria-invalid={!!errors[name]}
                          aria-describedby={
                            errors[name] ? name + "-error" : undefined
                          }
                        />
                        <button
                          type="button"
                          aria-label={"Aumentar " + label.toLowerCase()}
                          disabled={Number(values[name]) >= 100}
                          onClick={() =>
                            change(
                              name,
                              String(Math.min(100, Number(values[name]) + 1)),
                            )
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      {errors[name] ? (
                        <small className="wizard-error" id={name + "-error"}>
                          {errors[name]}
                        </small>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="wizard-grid">
                  {field("area", "Área privativa (m²)", {
                    type: "number",
                    min: 0.01,
                    max: 99999999.99,
                    step: "0.01",
                    placeholder: "120",
                  })}
                </div>
              </>
            ) : null}
            {step === 2 ? (
              <>
                {field("address", "Endereço completo", {
                  maxLength: 1000,
                  placeholder: "Rua, número e complemento",
                })}
                {field("neighborhood", "Bairro", {
                  maxLength: 120,
                  placeholder: "Santa Mônica",
                })}
                <div className="wizard-location-grid">
                  {field("city", "Cidade", {
                    maxLength: 120,
                    placeholder: "Uberlândia",
                  })}
                  {field("state", "UF", { maxLength: 2, placeholder: "MG" })}
                </div>
                <p className="wizard-private">
                  <LockKeyhole size={14} /> Endereço completo visível somente à
                  equipe autorizada.
                </p>
              </>
            ) : null}
            {step === 3 ? (
              <>
                <label className="wizard-field" htmlFor="description">
                  <span>Descrição do imóvel</span>
                  <textarea
                    id="description"
                    value={values.description}
                    onChange={(e) => change("description", e.target.value)}
                    rows={6}
                    maxLength={20000}
                    aria-invalid={!!errors.description}
                    aria-describedby="description-help"
                    placeholder="Apresente os ambientes, a iluminação e o que há por perto."
                  />
                  <small
                    id="description-help"
                    className={errors.description ? "wizard-error" : ""}
                  >
                    {errors.description ||
                      "Apresente o imóvel de forma clara para o comprador. Mínimo de 30 caracteres."}
                  </small>
                </label>
                <label className="wizard-field" htmlFor="features">
                  <span>
                    Diferenciais e características adicionais{" "}
                    <small>(opcional)</small>
                  </span>
                  <textarea
                    id="features"
                    value={values.features}
                    onChange={(e) => change("features", e.target.value)}
                    rows={3}
                    maxLength={4000}
                    placeholder={"Piscina\nÁrea gourmet\nEnergia solar"}
                    aria-invalid={!!errors.features}
                  />
                  <small className={errors.features ? "wizard-error" : ""}>
                    {errors.features ||
                      "Separe por vírgula ou escreva um diferencial por linha."}
                  </small>
                </label>
              </>
            ) : null}
            {step === 4 ? (
              <PropertyMediaManager propertyId={propertyId || undefined} initialPhotos={photos} initialDocuments={documents}/>
            ) : null}
            {step === 5 ? (
              <>
                <div className="wizard-preview">
                  <div className="wizard-preview-image">
                    <Building2 size={38} />
                    <span>Sem foto de capa</span>
                  </div>
                  <div>
                    <small>
                      {values.type} · {statuses[values.status]}
                    </small>
                    <h3>{values.title}</h3>
                    <strong>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(values.price) || 0)}
                    </strong>
                    <p>
                      {values.neighborhood} · {values.city}/
                      {values.state.toUpperCase()}
                    </p>
                    <p>
                      {values.bedrooms} quartos · {values.bathrooms} banheiros ·{" "}
                      {values.parking} vagas · {values.area} m²
                    </p>
                  </div>
                </div>
                <div className="wizard-summary">
                  <SummaryBlock title="Informações" onEdit={() => go(0)}>
                    <p>
                      Código: {values.code} · {statuses[values.status]}
                    </p>
                    <p>
                      Proprietário:{" "}
                      {initial.ownerNames
                        ? initial.ownerNames +
                          (ownerName !== "Não informado"
                            ? "; " + ownerName
                            : "")
                        : ownerName}
                    </p>
                  </SummaryBlock>
                  <SummaryBlock title="Características" onEdit={() => go(1)}>
                    <p>
                      {values.bedrooms} quartos · {values.bathrooms} banheiros ·{" "}
                      {values.parking} vagas · {values.area} m² privativos
                    </p>
                  </SummaryBlock>
                  <SummaryBlock title="Localização" onEdit={() => go(2)}>
                    <p>{values.address}</p>
                    <small>
                      Endereço interno. Região pública: {values.neighborhood},{" "}
                      {values.city}/{values.state.toUpperCase()}.
                    </small>
                  </SummaryBlock>
                  <SummaryBlock title="Descrição" onEdit={() => go(3)}>
                    <p className="wizard-description-preview">
                      {values.description}
                    </p>
                    <small>
                      {values.features || "Sem diferenciais informados."}
                    </small>
                  </SummaryBlock>
                  <SummaryBlock title="Fotos" onEdit={() => go(4)}>
                    <p>{photos.length ? `${photos.length} foto(s) cadastrada(s).` : propertyId ? "Adicione fotos antes de publicar." : "Salve o rascunho para adicionar fotos."}</p>
                  </SummaryBlock>
                  <SummaryBlock title="Documentos" onEdit={() => go(4)}>
                    <p>{documents.length ? `${documents.length} documento(s) privado(s).` : "Nenhum documento enviado."}</p>
                  </SummaryBlock>
                </div>
                <p className="wizard-private">
                  {values.status === "disponivel"
                    ? "Ao publicar, o anúncio ficará visível no site, mesmo sem fotos."
                    : "Este status mantém o imóvel fora do catálogo público."}
                </p>
              </>
            ) : null}
          </fieldset>
          {state.saved || saveHint ? (
            <p role="status" className="wizard-save-hint">
              {state.saved ? "Rascunho salvo. O envio de fotos e documentos está liberado." : saveHint}
            </p>
          ) : null}
          {state.error ? (
            <p role="alert" className="admin-form-error">
              {state.error}
            </p>
          ) : null}
        </div>
      </div>
      <footer className="wizard-actions">
        {step === 0 ? (
          <Link className="admin-button secondary" href="/painel/imoveis">
            Cancelar
          </Link>
        ) : (
          <button
            className="admin-button secondary"
            type="button"
            disabled={pending}
            onClick={() => go(step - 1)}
          >
            <ArrowLeft /> Voltar
          </button>
        )}
        <span className="wizard-step-label">{step + 1} de 6</span>
        <button
          className="admin-button secondary wizard-draft"
          type="submit"
          value="draft"
          disabled={pending}
        >
          Salvar rascunho
        </button>
        {step < 5 ? (
          <button
            key="continue"
            className="admin-button primary"
            type="button"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              next();
            }}
          >
            Continuar <ArrowRight />
          </button>
        ) : (
          <button
            key="save"
            className="admin-button primary"
            type="submit"
            value="save"
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="spin" /> Salvando…
              </>
            ) : values.status === "disponivel" ? (
              <>
                Publicar imóvel <Check />
              </>
            ) : (
              <>
                {editing ? "Salvar alterações" : "Salvar imóvel"} <Check />
              </>
            )}
          </button>
        )}
      </footer>
      {pending ? (
        <p role="status" className="wizard-saving">
          Salvando imóvel…
        </p>
      ) : null}
    </form>
  );
}
