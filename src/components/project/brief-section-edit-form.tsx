'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useBriefStore } from '@/stores/brief-store'

// ─── Field row helper ────────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-2">
      <label className="text-xs text-muted-foreground pt-2 whitespace-nowrap">{label}</label>
      {children}
    </div>
  )
}

// ─── Contact edit form ───────────────────────────────────────────────────────

function ContactEditForm({ onDone }: { onDone: () => void }) {
  const customer = useBriefStore((s) => s.brief?.customer)
  const updateCustomerInfo = useBriefStore((s) => s.updateCustomerInfo)

  const [firstName, setFirstName] = useState(customer?.firstName ?? '')
  const [lastName, setLastName] = useState(customer?.lastName ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [phone, setPhone] = useState(customer?.phone ?? '')
  const [company, setCompany] = useState(customer?.company ?? '')
  const [industry, setIndustry] = useState(customer?.industry ?? '')

  const handleSave = () => {
    updateCustomerInfo({
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      company: company.trim() || undefined,
      industry: industry.trim() || undefined,
    })
    onDone()
  }

  return (
    <div className="space-y-3">
      <FieldRow label="First Name">
        <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Last Name">
        <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Email">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Company">
        <Input value={company} onChange={(e) => setCompany(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Industry">
        <Input value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FormActions onSave={handleSave} onCancel={onDone} />
    </div>
  )
}

// ─── Project edit form ───────────────────────────────────────────────────────

function ProjectEditForm({ onDone }: { onDone: () => void }) {
  const project = useBriefStore((s) => s.brief?.project)
  const customerIndustry = useBriefStore((s) => s.brief?.customer?.industry)
  const updateProjectContext = useBriefStore((s) => s.updateProjectContext)
  const updateCustomerInfo = useBriefStore((s) => s.updateCustomerInfo)

  const [productItem, setProductItem] = useState(project?.productItem ?? '')
  const [deliveryCountry, setDeliveryCountry] = useState(project?.deliveryCountry ?? '')
  const [industry, setIndustry] = useState(customerIndustry ?? '')
  const [summary, setSummary] = useState(project?.summary ?? '')

  const handleSave = () => {
    updateProjectContext({
      productItem: productItem.trim() || undefined,
      deliveryCountry: deliveryCountry.trim() || undefined,
      summary: summary.trim() || undefined,
    })
    if (industry.trim() !== (customerIndustry ?? '')) {
      updateCustomerInfo({ industry: industry.trim() || undefined })
    }
    onDone()
  }

  return (
    <div className="space-y-3">
      <FieldRow label="Packaging Item">
        <Input value={productItem} onChange={(e) => setProductItem(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Industry">
        <Input value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Delivery Country">
        <Input value={deliveryCountry} onChange={(e) => setDeliveryCountry(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Summary">
        <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="min-h-[80px] text-sm" />
      </FieldRow>
      <FormActions onSave={handleSave} onCancel={onDone} />
    </div>
  )
}

// ─── Billing edit form ───────────────────────────────────────────────────────

function BillingEditForm({ onDone }: { onDone: () => void }) {
  const billing = useBriefStore((s) => s.brief?.billing)
  const updateBilling = useBriefStore((s) => s.updateBilling)

  const [street, setStreet] = useState(billing?.street ?? '')
  const [city, setCity] = useState(billing?.city ?? '')
  const [stateProvince, setStateProvince] = useState(billing?.stateProvince ?? '')
  const [postalCode, setPostalCode] = useState(billing?.postalCode ?? '')
  const [country, setCountry] = useState(billing?.country ?? '')

  const handleSave = () => {
    updateBilling({
      street: street.trim() || undefined,
      city: city.trim() || undefined,
      stateProvince: stateProvince.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
      country: country.trim() || undefined,
    })
    onDone()
  }

  return (
    <div className="space-y-3">
      <FieldRow label="Street">
        <Input value={street} onChange={(e) => setStreet(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="City">
        <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="State/Province">
        <Input value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Postal Code">
        <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Country">
        <Input value={country} onChange={(e) => setCountry(e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FormActions onSave={handleSave} onCancel={onDone} />
    </div>
  )
}

// ─── Save / Cancel buttons ───────────────────────────────────────────────────

function FormActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 gap-1 text-xs">
        <X className="size-3" />
        Cancel
      </Button>
      <Button size="sm" onClick={onSave} className="h-7 gap-1 text-xs">
        <Check className="size-3" />
        Save
      </Button>
    </div>
  )
}

// ─── Public API ──────────────────────────────────────────────────────────────

interface BriefSectionEditFormProps {
  sectionId: string
  onDone: () => void
}

export function BriefSectionEditForm({ sectionId, onDone }: BriefSectionEditFormProps) {
  switch (sectionId) {
    case 'contact':
      return <ContactEditForm onDone={onDone} />
    case 'project':
      return <ProjectEditForm onDone={onDone} />
    case 'billing':
      return <BillingEditForm onDone={onDone} />
    default:
      return null
  }
}
