/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Stokivo'
const SITE_URL = 'https://zentra-stock-flow.lovable.app'

interface AccountApprovedProps {
  companyName?: string
  ownerName?: string
  plan?: string
}

const AccountApprovedEmail = ({ companyName, ownerName, plan }: AccountApprovedProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your {SITE_NAME} account has been approved!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <div style={logoBadge}>S</div>
        </Section>
        <Heading style={h1}>
          {ownerName ? `Welcome aboard, ${ownerName}!` : 'Your account is approved!'}
        </Heading>
        <Text style={text}>
          Great news! Your business{companyName ? ` "${companyName}"` : ''} has been reviewed and approved on {SITE_NAME}.
          You now have full access to all features{plan ? ` on the ${plan} plan` : ''}.
        </Text>
        <Section style={ctaSection}>
          <Button style={button} href={`${SITE_URL}/login`}>
            Go to Dashboard
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={subtext}>Here's what you can do now:</Text>
        <Text style={listItem}>✓ Add your products and inventory</Text>
        <Text style={listItem}>✓ Set up your POS terminal</Text>
        <Text style={listItem}>✓ Invite your team members</Text>
        <Text style={listItem}>✓ Start processing sales</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Need help getting started? Reply to this email or visit our support page.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountApprovedEmail,
  subject: 'Your Stokivo account has been approved! 🎉',
  displayName: 'Account approved',
  previewData: { companyName: 'Acme Wholesale', ownerName: 'Jane', plan: 'Growth' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 25px', maxWidth: '520px', margin: '0 auto' }
const logoSection = { textAlign: 'center' as const, marginBottom: '24px' }
const logoBadge = {
  display: 'inline-block',
  width: '48px',
  height: '48px',
  lineHeight: '48px',
  borderRadius: '12px',
  background: 'linear-gradient(135deg, hsl(262, 60%, 30%), hsl(262, 55%, 50%))',
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700' as const,
  textAlign: 'center' as const,
}
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
