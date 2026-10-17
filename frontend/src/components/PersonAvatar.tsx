import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { useEffect, useMemo } from 'react'
import { api } from '@/lib/api'
import { initials } from '@/lib/format'

const SIZES = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-[13px]', lg: 'h-16 w-16 text-lg', xl: 'h-24 w-24 text-2xl' }

export function SampleImage({ personId, sampleId, className, alt }: { personId: string; sampleId: string; className?: string; alt: string }) {
  const { data: blob } = useQuery({
    queryKey: ['sample-image', sampleId],
    queryFn: () => api.sampleImage(personId, sampleId),
    staleTime: Infinity,
  })
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url])

  if (!url) return <div className={clsx('animate-pulse bg-raised', className)} />
  return <img src={url} alt={alt} className={clsx('object-cover', className)} draggable={false} />
}

interface PersonAvatarProps {
  person: { id: string; name: string; cover_sample_id?: string | null }
  size?: keyof typeof SIZES
}

export function PersonAvatar({ person, size = 'md' }: PersonAvatarProps) {
  const classes = clsx('shrink-0 rounded-full ring-1 ring-line', SIZES[size])
  if (person.cover_sample_id) {
    return <SampleImage personId={person.id} sampleId={person.cover_sample_id} alt={person.name} className={classes} />
  }
  return (
    <div className={clsx(classes, 'grid place-items-center bg-raised font-semibold text-muted')} aria-label={person.name}>
      {initials(person.name)}
    </div>
  )
}
