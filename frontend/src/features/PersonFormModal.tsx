import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { errorMessage } from '@/lib/api'
import type { Person, PersonFields } from '@/lib/types'

const EMPTY: PersonFields = { name: '', email: null, department: null, position: null, external_id: null, notes: null }

interface PersonFormModalProps {
  open: boolean
  onClose: () => void
  person?: Person
  onSubmit: (fields: PersonFields) => Promise<unknown>
}

export function PersonFormModal({ open, onClose, person, onSubmit }: PersonFormModalProps) {
  const [fields, setFields] = useState<PersonFields>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setFields(person ? { ...EMPTY, ...person } : EMPTY)
      setError(null)
    }
  }, [open, person])

  const text = (key: keyof PersonFields) => ({
    value: fields[key] ?? '',
    onChange: (e: { target: { value: string } }) => setFields((f) => ({ ...f, [key]: e.target.value })),
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit(fields)
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={person ? 'Editar pessoa' : 'Nova pessoa'}
      description={person ? undefined : 'Depois de salvar, você adiciona as fotos de referência.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="person-form" loading={saving}>
            {person ? 'Salvar' : 'Criar e adicionar fotos'}
          </Button>
        </>
      }
    >
      <form id="person-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Nome completo">
            <input className="field" required minLength={2} autoFocus {...text('name')} />
          </Field>
        </div>
        <Field label="E-mail">
          <input className="field" type="email" {...text('email')} />
        </Field>
        <Field label="Matrícula / ID">
          <input className="field" {...text('external_id')} />
        </Field>
        <Field label="Departamento">
          <input className="field" {...text('department')} />
        </Field>
        <Field label="Cargo">
          <input className="field" {...text('position')} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Observações">
            <textarea className="field h-20 resize-none py-2" {...text('notes')} />
          </Field>
        </div>
        {error && <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-[13px] text-bad sm:col-span-2">{error}</p>}
      </form>
    </Modal>
  )
}
