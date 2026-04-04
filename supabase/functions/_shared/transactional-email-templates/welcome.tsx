/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL = 'https://lsujpckltpgrydbfuadt.supabase.co/storage/v1/object/public/email-assets/stokivo-logo.png'
const SITE_NAME = 'Stokivo'
const SITE_URL = 'https://zentra-stock-flow.lovable.app'

interface WelcomeProps {
  ownerName?: string
  companyName?: string
  plan?: string
}

const WelcomeEmail = ({ ownerName, companyName, plan }: WelcomeProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to {SITE_NAME} — let's get your business set up!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="48" height="48" style={logoImg} />
        </Section>
        <Heading style={h1}>
          {ownerName ? `Hey ${ownerName}, welcome to ${SITE_NAME}!` : `Welcome to ${SITE_NAME}!`}
        </Heading>
        <Text style={text}>
          {companyName
            ? `Your business "${companyName}" has been registered${plan ? ` on the ${plan} plan` : ''}.`
            : 'Your account has been created.'}
          {' '}Your account is now under review — we'll notify you as soon as it's approved (usually within 24 hours).
        </Text>
        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/login`}>
            Check Your Status
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={subtext}>While you wait, here's what to expect:</Text>
        <Text style={listItem}>📋 Our team will review your business details</Text>
        <Text style={listItem}>✅ You'll receive an email once approved</Text>
        <Text style={listItem}>🚀 Then you'll have full access to manage inventory, sales & more</Text>
        <Hr style={hr} />
        <Text style={subtext}>What's included{plan ? ` in your ${plan} plan` : ''}:</Text>
        <Text style={listItem}>• Inventory management & low-stock alerts</Text>
        <Text style={listItem}>• Point of Sale (POS) system</Text>
        <Text style={listItem}>• Invoicing & payment tracking</Text>
        <Text style={listItem}>• Customer & supplier management</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Questions? Just reply to this email — we're happy to help.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Stokivo! 🎉',
  displayName: 'Welcome email',
  previewData: { ownerName: 'Jane', companyName: 'Acme Wholesale', plan: 'Growth' },
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
