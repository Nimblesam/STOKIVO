/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://lsujpckltpgrydbfuadt.supabase.co/storage/v1/object/public/email-assets/stokivo-logo.png'
const SITE_NAME = 'Stokivo'
const SITE_URL = 'https://stokivo.com'

interface TrialReminderProps {
  ownerName?: string
  companyName?: string
  daysRemaining?: number
  trialEndDate?: string
  expired?: boolean
}

const TrialReminderEmail = ({ ownerName, companyName, daysRemaining = 0, trialEndDate, expired }: TrialReminderProps) => {
  const headline = expired
    ? `Your ${SITE_NAME} trial has ended`
    : daysRemaining === 1
      ? `Your trial ends tomorrow`
      : `${daysRemaining} days left in your trial`

  const intro = expired
    ? `Your free trial${companyName ? ` for "${companyName}"` : ''} has ended. Upgrade now to keep access to your dashboard, products, sales history, and reports.`
    : `Just a heads up — your free 30-day trial${companyName ? ` for "${companyName}"` : ''} ends ${trialEndDate ? `on ${trialEndDate}` : `in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`}. Add a payment method to keep everything running without interruption.`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{headline} — keep your business running on {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoSection}>
            <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={logoImg} />
          </Section>
          <Heading style={h1}>
            {ownerName ? `${ownerName}, ${headline.toLowerCase()}` : headline}
          </Heading>
          <Text style={text}>{intro}</Text>

          <Section style={ctaSection}>
            <Button style={button} href={`${SITE_URL}/settings?tab=billing`}>
              {expired ? 'Upgrade Now' : 'Choose Your Plan'}
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={subtext}>What you'll keep with a paid plan:</Text>
          <Text style={listItem}>📦 Full inventory & multi-store management</Text>
          <Text style={listItem}>💳 POS, invoicing & payment links</Text>
          <Text style={listItem}>📊 Analytics, AI insights & forecasting</Text>
          <Text style={listItem}>👥 Team members, roles & cashier accounts</Text>
          <Hr style={hr} />
          <Text style={footer}>
            Plans start at £19/month. Cancel anytime — no questions asked.
          </Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TrialReminderEmail,
  subject: (data: Record<string, any>) => {
    if (data.expired) return `Your ${SITE_NAME} trial has ended — upgrade to continue`
    const d = data.daysRemaining ?? 0
    if (d === 1) return `Your ${SITE_NAME} trial ends tomorrow`
    return `${d} days left in your ${SITE_NAME} trial`
  },
  displayName: 'Trial reminder',
  previewData: { ownerName: 'Jane', companyName: 'Acme Wholesale', daysRemaining: 3, trialEndDate: 'May 16, 2026' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '520px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoImg = { borderRadius: '12px' }
const h1 = { fontSize: '22px', fontWeight: '700', color: 'hsl(220, 30%, 12%)', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '14px', color: 'hsl(215, 15%, 50%)', lineHeight: '1.6', margin: '0 0 20px' }
const subtext = { fontSize: '14px', color: 'hsl(220, 30%, 12%)', fontWeight: '600', margin: '16px 0 8px' }
const listItem = { fontSize: '14px', color: 'hsl(215, 15%, 50%)', lineHeight: '1.8', margin: '0', paddingLeft: '4px' }
const ctaSection = { textAlign: 'center' as const, margin: '24px 0' }
const button = {
  backgroundColor: 'hsl(262, 60%, 30%)',
  color: '#ffffff',
  borderRadius: '10px',
  fontSize: '14px',
  fontWeight: '600',
  padding: '12px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: 'hsl(215, 20%, 90%)', margin: '24px 0' }
const footer = { fontSize: '12px', color: 'hsl(215, 15%, 50%)', margin: '0 0 8px' }
