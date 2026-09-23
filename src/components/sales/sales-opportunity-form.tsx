"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Building2, User, Handshake, ClipboardList, MessageSquare, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select, Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ACCOUNT_STATUSES,
  COMPANY_SIZES,
  SOURCES,
  PREFERRED_CONTACT_METHODS,
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_TYPES,
  DEPLOYMENT_OPTIONS,
  ACTIVITY_TYPES,
  DEFAULT_CURRENCY,
  type OpportunityStage,
} from "@/lib/validations";
import { createSalesOpportunity, type ActionState } from "@/lib/actions/sales";
import type { PipelineStageRow } from "@/lib/pipeline-stages";
import { useDict } from "@/i18n/locale-context";
import {
  accountStatusLabel,
  sourceLabel,
  preferredContactMethodLabel,
  resolveStageLabel,
  opportunityPriorityLabel,
  opportunityTypeLabel,
  deploymentOptionLabel,
  activityTypeLabel,
} from "@/i18n/enum-labels";

type CompanyOption = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  companySize: string | null;
  country: string | null;
  city: string | null;
  accountStatus: string;
};
type ContactOption = { id: string; name: string; email: string | null; jobTitle: string | null; companyId: string | null };
type OwnerOption = { id: string; name: string };

const CURRENCIES = ["JOD", "USD", "EUR", "GBP", "SAR", "AED"];

type SectionId = "company" | "contact" | "opportunity" | "requirements" | "activity";

function AccordionSection({
  icon: Icon,
  title,
  description,
  isOpen,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          "flex w-full items-start gap-3 px-5 py-4 text-start transition-colors hover:bg-background",
          isOpen && "border-b border-border"
        )}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
        <div className="flex-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        <ChevronDown
          className={cn(
            "mt-1.5 size-4.5 shrink-0 text-muted transition-transform duration-300 ease-in-out",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </Card>
  );
}

export function SalesOpportunityForm({
  currentUser,
  owners,
  companies,
  contacts,
  stages,
}: {
  currentUser: { id: string; role: string };
  owners: OwnerOption[];
  companies: CompanyOption[];
  contacts: ContactOption[];
  stages: PipelineStageRow[];
}) {
  const dict = useDict();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(createSalesOpportunity, null);
  const canAssignOwner = currentUser.role === "ADMIN";

  // --- Company ---
  const [companyName, setCompanyName] = useState("");
  const companyMatch = useMemo(
    () => companies.find((c) => c.name.toLowerCase() === companyName.trim().toLowerCase()),
    [companies, companyName]
  );
  const [companyOverrideNew, setCompanyOverrideNew] = useState(false);
  const usingExistingCompany = !!companyMatch && !companyOverrideNew;

  // --- Contact ---
  const [contactName, setContactName] = useState("");
  const contactsForCompany = useMemo(
    () => (usingExistingCompany ? contacts.filter((c) => c.companyId === companyMatch?.id) : []),
    [usingExistingCompany, contacts, companyMatch]
  );
  const contactMatch = useMemo(
    () => contactsForCompany.find((c) => c.name.toLowerCase() === contactName.trim().toLowerCase()),
    [contactsForCompany, contactName]
  );
  const [contactOverrideNew, setContactOverrideNew] = useState(false);
  const usingExistingContact = !!contactMatch && !contactOverrideNew;

  // --- Opportunity ---
  const [stage, setStage] = useState<OpportunityStage>("NEW");
  const [probability, setProbability] = useState(stages.find((s) => s.id === "NEW")?.defaultProbability ?? 10);
  const [opportunityTitle, setOpportunityTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const displayedTitle = titleTouched ? opportunityTitle : companyName.trim() ? `${companyName.trim()} ${dict.sales.autoTitleSuffix}` : "";

  // --- Requirements ---
  const [deployment, setDeployment] = useState("");

  const [clientError, setClientError] = useState<string | null>(null);

  // --- Accordion: only one section open at a time ---
  const [openSection, setOpenSection] = useState<SectionId | null>("company");
  const toggleSection = (id: SectionId) => setOpenSection((current) => (current === id ? null : id));

  // --- Warn before leaving with unsaved changes (browser close/refresh + in-app nav links) ---
  const dirtyRef = useRef(false);
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    function handleClick(e: MouseEvent) {
      if (!dirtyRef.current) return;
      const link = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href === window.location.pathname) return;
      if (!window.confirm(dict.sales.unsavedChangesConfirm)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      } else {
        dirtyRef.current = false;
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [dict.sales.unsavedChangesConfirm]);

  return (
    <form
      action={formAction}
      onChange={() => {
        dirtyRef.current = true;
      }}
      onSubmit={(e) => {
        if (!contactName.trim()) {
          e.preventDefault();
          setClientError(dict.sales.contactNameRequired);
          requestAnimationFrame(() => document.getElementById("contactName")?.focus());
          return;
        }
        dirtyRef.current = false;
        setClientError(null);
      }}
      className="space-y-6"
    >
      {clientError || state?.error ? (
        <div className="rounded-lg bg-danger-bg px-4 py-3 text-sm text-danger">{clientError ?? state?.error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
        <span className="flex items-center gap-1.5 text-muted">
          <Building2 className="size-3.5" />
          {companyName.trim() || dict.sales.breadcrumbNoAccount}
        </span>
        <span className="text-border">/</span>
        <span className={cn("flex items-center gap-1.5", contactName.trim() ? "font-medium text-foreground" : "text-muted")}>
          <User className="size-3.5" />
          {contactName.trim() || dict.sales.breadcrumbContactNeeded}
        </span>
        <span className="text-border">/</span>
        <span className="flex items-center gap-1.5 text-muted">
          <Handshake className="size-3.5" />
          {displayedTitle || dict.sales.breadcrumbUntitled}
        </span>
      </div>

      <input type="hidden" name="companyMode" value={usingExistingCompany ? "existing" : "new"} />
      {usingExistingCompany ? <input type="hidden" name="companyId" value={companyMatch!.id} /> : null}
      <input type="hidden" name="contactMode" value={usingExistingContact ? "existing" : "new"} />
      {usingExistingContact ? <input type="hidden" name="contactId" value={contactMatch!.id} /> : null}
      {!canAssignOwner ? <input type="hidden" name="ownerId" value={currentUser.id} /> : null}

      <div className="space-y-4">

      <AccordionSection
        icon={Building2}
        title={dict.sales.companyCardTitle}
        isOpen={openSection === "company"}
        onToggle={() => toggleSection("company")}
      >
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="companyName">{dict.sales.companyNameLabel}</Label>
            <Input
              id="companyName"
              name="companyName"
              autoComplete="off"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                setCompanyOverrideNew(false);
              }}
              placeholder={dict.sales.companyNamePlaceholder}
            />
          </div>

          {companyMatch ? (
            <div className="flex items-center justify-between rounded-lg bg-info-bg px-3 py-2 text-sm text-info">
              <span>
                {companyOverrideNew
                  ? dict.sales.continuingAsNewAccount.replace("{name}", companyName)
                  : dict.sales.usingExistingAccount
                      .replace("{name}", companyMatch.name)
                      .replace("{status}", accountStatusLabel(dict, companyMatch.accountStatus))}
              </span>
              <button
                type="button"
                onClick={() => setCompanyOverrideNew((v) => !v)}
                className="ms-3 shrink-0 font-medium underline"
              >
                {companyOverrideNew ? dict.sales.useExistingInstead : dict.sales.continueAsNew}
              </button>
            </div>
          ) : null}

          {!usingExistingCompany ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={dict.fields.industry} htmlFor="companyIndustry">
                <Input id="companyIndustry" name="companyIndustry" />
              </Field>
              <Field label={dict.fields.website} htmlFor="companyWebsite">
                <Input id="companyWebsite" name="companyWebsite" placeholder="https://" />
              </Field>
              <Field label={dict.fields.country} htmlFor="companyCountry">
                <Input id="companyCountry" name="companyCountry" />
              </Field>
              <Field label={dict.fields.city} htmlFor="companyCity">
                <Input id="companyCity" name="companyCity" />
              </Field>
              <Field label={dict.companies.companySizeField} htmlFor="companySize">
                <Select id="companySize" name="companySize" defaultValue="">
                  <option value="">{dict.common.unspecified}</option>
                  {COMPANY_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={dict.fields.accountStatus} htmlFor="companyAccountStatus">
                <Select id="companyAccountStatus" name="companyAccountStatus" defaultValue="PROSPECT">
                  {ACCOUNT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {accountStatusLabel(dict, s)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={dict.fields.source} htmlFor="companySource">
                <Select id="companySource" name="companySource" defaultValue="">
                  <option value="">{dict.common.unspecified}</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {sourceLabel(dict, s)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}
        </CardBody>
      </AccordionSection>

      <AccordionSection
        icon={User}
        title={dict.sales.contactCardTitle}
        isOpen={openSection === "contact"}
        onToggle={() => toggleSection("contact")}
      >
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="contactName">{dict.sales.fullNameRequired}</Label>
            <Input
              id="contactName"
              name="contactName"
              autoComplete="off"
              value={contactName}
              onChange={(e) => {
                setContactName(e.target.value);
                setContactOverrideNew(false);
              }}
              placeholder={dict.sales.contactNamePlaceholder}
            />
          </div>

          {contactMatch ? (
            <div className="flex items-center justify-between rounded-lg bg-info-bg px-3 py-2 text-sm text-info">
              <span>
                {contactOverrideNew
                  ? dict.sales.continuingAsNewContact.replace("{name}", contactName)
                  : dict.sales.usingExistingContact
                      .replace("{name}", contactMatch.name)
                      .replace("{jobTitle}", contactMatch.jobTitle ? ` (${contactMatch.jobTitle})` : "")}
              </span>
              <button
                type="button"
                onClick={() => setContactOverrideNew((v) => !v)}
                className="ms-3 shrink-0 font-medium underline"
              >
                {contactOverrideNew ? dict.sales.useExistingInstead : dict.sales.continueAsNew}
              </button>
            </div>
          ) : null}

          {!usingExistingContact ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={dict.fields.jobTitle} htmlFor="contactJobTitle">
                <Input id="contactJobTitle" name="contactJobTitle" />
              </Field>
              <Field label={dict.fields.department} htmlFor="contactDepartment">
                <Input id="contactDepartment" name="contactDepartment" />
              </Field>
              <Field label={dict.fields.email} htmlFor="contactEmail">
                <Input id="contactEmail" name="contactEmail" type="email" />
              </Field>
              <Field label={dict.fields.phone} htmlFor="contactPhone">
                <Input id="contactPhone" name="contactPhone" />
              </Field>
              <Field label={dict.fields.preferredContactMethod} htmlFor="contactPreferredMethod">
                <Select id="contactPreferredMethod" name="contactPreferredMethod" defaultValue="">
                  <option value="">{dict.common.unspecified}</option>
                  {PREFERRED_CONTACT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {preferredContactMethodLabel(dict, m)}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex flex-wrap gap-6 sm:col-span-2">
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" name="contactIsDecisionMaker" className="size-4" />
                  {dict.fields.decisionMaker}
                </label>
                <label className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" name="contactIsPrimary" className="size-4" />
                  {dict.sales.primaryContactCheckbox}
                </label>
              </div>
            </div>
          ) : null}
        </CardBody>
      </AccordionSection>

      <AccordionSection
        icon={Handshake}
        title={dict.sales.opportunityCardTitle}
        isOpen={openSection === "opportunity"}
        onToggle={() => toggleSection("opportunity")}
      >
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={dict.sales.opportunityNameLabel} htmlFor="opportunityTitle">
            <Input
              id="opportunityTitle"
              name="opportunityTitle"
              value={displayedTitle}
              onChange={(e) => {
                setOpportunityTitle(e.target.value);
                setTitleTouched(true);
              }}
            />
          </Field>
          {canAssignOwner ? (
            <Field label={dict.sales.salesOwnerRequired} htmlFor="ownerId">
              <Select id="ownerId" name="ownerId" defaultValue={currentUser.id}>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {canAssignOwner ? (
            <Field label={dict.opportunities.visibilityLabel} htmlFor="opportunityVisibility">
              <Select id="opportunityVisibility" name="opportunityVisibility" defaultValue="OWNER">
                <option value="OWNER">{dict.opportunities.visibilityOwnerOnly}</option>
                <option value="EVERYONE">{dict.opportunities.visibilityEveryone}</option>
              </Select>
            </Field>
          ) : null}
          <Field label={dict.sales.leadSource} htmlFor="opportunitySource">
            <Select id="opportunitySource" name="opportunitySource" defaultValue="">
              <option value="">{dict.common.unspecified}</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {sourceLabel(dict, s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={dict.sales.stageRequired} htmlFor="opportunityStage">
            <Select
              id="opportunityStage"
              name="opportunityStage"
              value={stage}
              onChange={(e) => {
                const next = e.target.value as OpportunityStage;
                setStage(next);
                setProbability(stages.find((s) => s.id === next)?.defaultProbability ?? 50);
              }}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {resolveStageLabel(dict, s.id, stages)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={dict.sales.estimatedValue} htmlFor="opportunityValue">
            <Input id="opportunityValue" name="opportunityValue" type="number" min="0" step="0.01" defaultValue={0} />
          </Field>
          <Field label={dict.opportunities.currency} htmlFor="opportunityCurrency">
            <Select id="opportunityCurrency" name="opportunityCurrency" defaultValue={DEFAULT_CURRENCY}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={dict.sales.winProbability.replace("{pct}", String(probability))} htmlFor="opportunityProbability">
            <input
              id="opportunityProbability"
              name="opportunityProbability"
              type="range"
              min={0}
              max={100}
              step={5}
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </Field>
          <Field label={dict.sales.expectedCloseDate} htmlFor="opportunityExpectedCloseDate">
            <Input id="opportunityExpectedCloseDate" name="opportunityExpectedCloseDate" type="date" />
          </Field>
          <Field label={dict.sales.salesPriority} htmlFor="opportunityPriority">
            <Select id="opportunityPriority" name="opportunityPriority" defaultValue="">
              <option value="">{dict.common.unspecified}</option>
              {OPPORTUNITY_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {opportunityPriorityLabel(dict, p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={dict.sales.opportunityType} htmlFor="opportunityType">
            <Select id="opportunityType" name="opportunityType" defaultValue="">
              <option value="">{dict.common.unspecified}</option>
              {OPPORTUNITY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {opportunityTypeLabel(dict, t)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={dict.sales.nextActionOptional} htmlFor="opportunityNextAction">
              <Textarea id="opportunityNextAction" name="opportunityNextAction" rows={2} />
            </Field>
          </div>
        </CardBody>
      </AccordionSection>

      <AccordionSection
        icon={ClipboardList}
        title={dict.sales.requirementsCardTitle}
        isOpen={openSection === "requirements"}
        onToggle={() => toggleSection("requirements")}
      >
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={dict.sales.businessProblem} htmlFor="reqBusinessProblem">
              <Textarea id="reqBusinessProblem" name="reqBusinessProblem" rows={2} />
            </Field>
            <Field label={dict.sales.customerObjective} htmlFor="reqCustomerObjective">
              <Textarea id="reqCustomerObjective" name="reqCustomerObjective" rows={2} />
            </Field>
            <Field label={dict.sales.requiredSolution} htmlFor="reqRequiredSolution">
              <Textarea id="reqRequiredSolution" name="reqRequiredSolution" rows={2} />
            </Field>
            <Field label={dict.sales.functionalRequirements} htmlFor="reqFunctionalRequirements">
              <Textarea id="reqFunctionalRequirements" name="reqFunctionalRequirements" rows={2} />
            </Field>
            <Field label={dict.sales.technicalRequirements} htmlFor="reqTechnicalRequirements">
              <Textarea id="reqTechnicalRequirements" name="reqTechnicalRequirements" rows={2} />
            </Field>
            <Field label={dict.sales.deployment} htmlFor="reqDeployment">
              <Select id="reqDeployment" name="reqDeployment" value={deployment} onChange={(e) => setDeployment(e.target.value)}>
                <option value="">{dict.common.unspecified}</option>
                {DEPLOYMENT_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {deploymentOptionLabel(dict, d)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {deployment === "ON_PREMISE" || deployment === "HYBRID" ? (
            <Field label={dict.sales.infrastructureNotes} htmlFor="reqInfrastructureNotes">
              <Textarea id="reqInfrastructureNotes" name="reqInfrastructureNotes" rows={2} />
            </Field>
          ) : null}
        </CardBody>
      </AccordionSection>

      <AccordionSection
        icon={MessageSquare}
        title={dict.sales.activityCardTitle}
        isOpen={openSection === "activity"}
        onToggle={() => toggleSection("activity")}
      >
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label={dict.sales.activityType} htmlFor="activityType">
            <Select id="activityType" name="activityType" defaultValue="NOTE">
              {ACTIVITY_TYPES.filter((t) => t !== "STAGE_CHANGE").map((t) => (
                <option key={t} value={t}>
                  {activityTypeLabel(dict, t)}
                </option>
              ))}
            </Select>
          </Field>
          <div />
          <div className="sm:col-span-2">
            <Field label={dict.sales.activityNotes} htmlFor="activityContent">
              <Textarea id="activityContent" name="activityContent" rows={2} placeholder={dict.sales.activityNotesPlaceholder} />
            </Field>
          </div>
          <Field label={dict.sales.nextFollowUpTask} htmlFor="taskTitle">
            <Input id="taskTitle" name="taskTitle" placeholder={dict.sales.taskTitlePlaceholder} />
          </Field>
          <Field label={dict.sales.followUpDueDate} htmlFor="taskDueDate">
            <Input id="taskDueDate" name="taskDueDate" type="date" />
          </Field>
          <div className="sm:col-span-2">
            <Field label={dict.sales.internalNotes} htmlFor="opportunityNotes">
              <Textarea id="opportunityNotes" name="opportunityNotes" rows={2} />
            </Field>
          </div>
        </CardBody>
      </AccordionSection>

      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? dict.common.saving : dict.sales.createButton}
        </Button>
      </div>
    </form>
  );
}
