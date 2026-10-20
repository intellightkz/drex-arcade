// Beat Drex: the messages and the question Drex answers. Labels are the intended answer for each message.
export const CATEGORIES = {
  spam: { label: 'Spam / scam', key: '1', criteria: 'Spam, scam or phishing: an unsolicited offer, a fake prize or alert, a suspicious link, or a request for passwords, payment or bank details.' },
  urgent: { label: 'Urgent', key: '2', criteria: 'Real and needs action today: an outage, failing payments, a security incident, a legal or compliance deadline today, or a customer about to leave.' },
  later: { label: 'Can wait', key: '3', criteria: 'Real but can wait: newsletters, routine updates, scheduling, general questions, feedback or reminders with plenty of time.' },
};

export const INSTRUCTIONS = 'You triage an inbox for a small software company. Sort this message into exactly one bucket.';

export const MESSAGES = [
  { id: 's1', label: 'spam', from: 'rewards@amaz0n-gifts.co', text: "Congratulations! You've been selected to receive a $1,000 Amazon gift card. Claim within 24h: amaz0n-rewards.co/claim" },
  { id: 's2', label: 'spam', from: 'service@paypa1-secure.net', text: 'Your PayPal account has been limited. Verify your identity now at paypal-secure-login.net to avoid suspension.' },
  { id: 's3', label: 'spam', from: 'barrister.james@consultant.com', text: 'Dear friend, I represent a late client with no heirs. $4.5M can be transferred to you. Reply with your bank details.' },
  { id: 's4', label: 'spam', from: '@cashflow_daily', text: 'Earn $500/day from home!!! No experience needed. DM me START 💸💸' },
  { id: 's5', label: 'spam', from: 'USPS', text: 'Your package could not be delivered. Pay the $1.99 redelivery fee here: usps-redeliver.info' },
  { id: 's6', label: 'spam', from: 'growth@instaboost.biz', text: 'Boost your Instagram to 10K followers in 48 hours. 70% off today only!' },
  { id: 's7', label: 'spam', from: 'no-reply@appleid-verify.co', text: 'Apple ID alert: your account was used to sign in from an unknown device. Confirm your password at appleid-verify.co' },
  { id: 's8', label: 'spam', from: 'mike@rank1-seo.agency', text: 'We noticed your website has SEO issues. We guarantee you #1 on Google. Reply for a free audit!' },
  { id: 's9', label: 'spam', from: '@ai_trader_pro', text: 'Our AI trading bot returns 40% a week. Send 0.1 BTC to start, withdraw anytime.' },
  { id: 's10', label: 'spam', from: 'billing@netflix-help-center.com', text: 'Your Netflix payment failed. Update your card within 12 hours: netflix-billing-help.com' },
  { id: 's11', label: 'spam', from: 'voicemail@office365-mail.info', text: 'You have (3) unread voicemails. Listen here: bit.ly/vm-3x9z and sign in with your Microsoft 365 password.' },
  { id: 's12', label: 'spam', from: 'lottery@intl-draw.org', text: 'Your email won the International Online Draw. Send a $50 processing fee to release your $250,000 prize.' },

  { id: 'u1', label: 'urgent', from: 'oncall@company.com', text: "Checkout is down for all users since 9:42. Payments are failing and we're losing orders every minute." },
  { id: 'u2', label: 'urgent', from: 'alerts@company.com', text: 'The production database is at 98% disk. Writes will start failing in about 20 minutes.' },
  { id: 'u3', label: 'urgent', from: 'hr@company.com', text: "Payroll didn't go out this morning. 140 employees haven't been paid. Please call me ASAP." },
  { id: 'u4', label: 'urgent', from: 'security@company.com', text: 'Someone just logged into the admin panel from an unknown IP and created 3 new API keys.' },
  { id: 'u5', label: 'urgent', from: 'sarah@acme.com', text: "We're your biggest account. We will cancel today unless the export bug is fixed." },
  { id: 'u6', label: 'urgent', from: 'monitor@company.com', text: 'The SSL certificate on app.company.com expires in 2 hours. Browsers will show security warnings.' },
  { id: 'u7', label: 'urgent', from: 'legal@company.com', text: 'The response to the court notice must be filed by 5 PM today or we default.' },
  { id: 'u8', label: 'urgent', from: 'dan.k@gmail.com', text: 'My card was charged 6 times for the same order, $2,400 total. I need this reversed now, my rent is due.' },
  { id: 'u9', label: 'urgent', from: 'ceo@company.com', text: 'The investor demo starts in 30 minutes and staging returns a 500 error on login.' },
  { id: 'u10', label: 'urgent', from: 'billing-alerts@aws', text: 'Your AWS spend is $18,000 today, up from $300 yesterday. Something is running away.' },
  { id: 'u11', label: 'urgent', from: 'support@company.com', text: 'Three customers report they can see other customers’ invoices in their dashboard.' },
  { id: 'u12', label: 'urgent', from: 'facilities@company.com', text: 'Water is leaking into the server room right now. Need someone with access on site.' },

  { id: 'l1', label: 'later', from: 'news@producthunt.com', text: 'Our monthly newsletter: 5 new launches we loved in October.' },
  { id: 'l2', label: 'later', from: 'alex@company.com', text: "Could we move Thursday's 1:1 to Friday morning? No rush." },
  { id: 'l3', label: 'later', from: 'prospect@startup.io', text: 'Quick question: does the Pro plan include SSO, or is that Enterprise only?' },
  { id: 'l4', label: 'later', from: 'ops@company.com', text: 'Reminder: the team offsite RSVP closes next Friday.' },
  { id: 'l5', label: 'later', from: 'comms@company.com', text: "Here are the slides from last week's all-hands, for anyone who missed it." },
  { id: 'l6', label: 'later', from: 'user482@gmail.com', text: 'Feature request: it would be nice to export reports as CSV someday.' },
  { id: 'l7', label: 'later', from: 'analytics@company.com', text: 'Your weekly analytics summary: traffic up 4% week over week.' },
  { id: 'l8', label: 'later', from: 'maria@happyclient.com', text: 'Thanks for the great support last month, we love the product!' },
  { id: 'l9', label: 'later', from: 'office@company.com', text: 'The office coffee machine will be replaced next Tuesday.' },
  { id: 'l10', label: 'later', from: 'jordan@company.com', text: 'Can you review my blog draft sometime this week? Link inside.' },
  { id: 'l11', label: 'later', from: 'billing@figma.com', text: 'Your invoice for October is attached. Payment is due in 30 days.' },
  { id: 'l12', label: 'later', from: 'notifications@linkedin.com', text: '3 people viewed your profile this week.' },
];

export function question() {
  return { bucket: { type: 'choice', instructions: INSTRUCTIONS, criteria: Object.fromEntries(Object.entries(CATEGORIES).map(([k, c]) => [k, c.criteria])) } };
}
export const stateFor = (m) => ({ from: m.from, message: m.text });
