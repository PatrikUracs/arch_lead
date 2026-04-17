import OnboardForm from '@/components/OnboardForm'

// Server component — checks the ?key= query param against ONBOARD_SECRET
export default function OnboardPage({
  searchParams,
}: {
  searchParams: { key?: string }
}) {
  const secret = process.env.ONBOARD_SECRET
  const slug = process.env.NEXT_PUBLIC_DESIGNER_SLUG ?? 'designer'
  const accessKey = searchParams.key ?? ''

  if (secret && accessKey !== secret) {
    return (
      <div
        style={{
          background: 'radial-gradient(ellipse at center, #141414 0%, #0A0A0A 70%)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: 'rgba(245, 240, 232, 0.3)',
            fontFamily: 'var(--font-montserrat)',
            fontWeight: 200,
            fontSize: 13,
            letterSpacing: '0.06em',
          }}
        >
          Access denied.
        </p>
      </div>
    )
  }

  return <OnboardForm slug={slug} accessKey={accessKey} />
}
