# Agency Operators - Full Agency Audit Form

A modern, single-page web form for collecting comprehensive agency audit data. Built with vanilla HTML/CSS/JS for easy deployment.

## Live URLs

- **Production**: https://audit-frontend-ten.vercel.app
- **GitHub**: https://github.com/benreeder-coder/agency-operators-audit

## Features

- **Single Page Design**: All 11 sections on one scrollable page for easy reference
- **Sidebar Navigation**: Sticky left sidebar with section links and scroll-spy highlighting
- **Progress Tracking**: Visual progress bar shows completion percentage as you fill out the form
- **File Uploads**: Drag-and-drop file upload boxes for documents (org chart, financials, SOPs, team comp)
- **Auto-Save & Persistence**: Form progress saved to localStorage and persists across page refreshes
- **Mobile Responsive**: Collapses sidebar to hamburger menu on mobile
- **n8n Integration**: Sends structured JSON (including base64 files) to webhook on submission

## Form Sections

1. **Contact Info** - Name, email, phone, company, address, preferred contact
2. **Strategy** - Mission, vision, values, pricing, services, ICP, client value, org chart (file upload)
3. **Goals** - Success definition, initiatives, 1-year goal, 3-5 year goal, challenges
4. **Lead Generation** - Methods, percentages, CRM
5. **Lead Nurture** - Process, CRM
6. **Sales** - Process, team size, CRM
7. **Recruiting/Hiring** - Process, onboarding, training, CRM
8. **Operations** - Client onboarding, meeting cadence, reporting, team comp (file), SOPs (file)
9. **Financials** - P&L / Balance Sheet (file upload)
10. **Voice of Data** - Monthly metrics table + business averages
11. **Challenges & Action Plan** - Summary areas

## n8n Webhook Integration

The form POSTs JSON data to the hardcoded webhook URL:
```
https://agencyoperators123.app.n8n.cloud/webhook/audit-btb
```

### Payload Structure

All fields are included in the payload, even if empty (shown as `null`):

```json
{
  "submitted_at": "2024-01-09T12:00:00.000Z",
  "contact": {
    "yourName": "John Doe",
    "yourEmail": "john@example.com",
    "yourPhone": "555-1234",
    "companyName": "Acme Agency",
    "personalAddress": "123 Main St",
    "preferredContact": "email"
  },
  "strategy": {
    "strategy": "...",
    "mission": "...",
    "vision": "...",
    "coreValues": "...",
    "newClientOffer": "...",
    "services": "...",
    "icp": "...",
    "clientValue": "...",
    "clientCountries": "..."
  },
  "goals": {
    "successDefinition": "...",
    "initiatives": "...",
    "oneYearGoal": "...",
    "threeToFiveYearGoal": "...",
    "biggestChallenges": "...",
    "fulfillmentTime": "...",
    "additionalProblems": "..."
  },
  "lead_generation": {
    "leadGenMethods": "...",
    "leadGenPercentages": "...",
    "leadGenCRM": "..."
  },
  "lead_nurture": {
    "leadNurtureProcess": "...",
    "leadNurtureCRM": "..."
  },
  "sales": {
    "salesProcess": "...",
    "salesTeamSize": "...",
    "salesCRM": "..."
  },
  "recruiting": {
    "recruitingProcess": "...",
    "hiringProcess": "...",
    "teamOnboarding": "...",
    "trainingProcess": "...",
    "recruitingCRM": "..."
  },
  "operations": {
    "clientOnboarding": "...",
    "clientMeetingCadence": "...",
    "clientReportingCadence": "...",
    "teamMeetingCadence": "...",
    "projectManagement": "..."
  },
  "financials": {},
  "voice_of_data": {
    "monthly_averages": {
      "avgReferrals": "5",
      "avgLeads": "50",
      "avgClients": "25",
      "avgChurn": "5%",
      "avgTeamSize": "10",
      "avgRevenue": "$50,000",
      "avgProfit": "20%"
    },
    "averages": {
      "initialCallsBooked": "...",
      "callsShowedUp": "...",
      "qualifiedCalls": "...",
      "salesCloseRate": "...",
      "newCustomerAOV": "...",
      "totalClientCapacity": "...",
      "fulfillmentLeadTime": "...",
      "deliveredOnTime": "...",
      "fulfillmentErrors": "...",
      "reworkRate": "...",
      "clientsUpsold": "...",
      "employeeChurn": "...",
      "revenuePerEmployee": "...",
      "grossMargins": "...",
      "netCashflow": "...",
      "arCollected": "..."
    }
  },
  "action_plan": {
    "identifiedChallenges": "...",
    "actionPlan": "..."
  },
  "files": {
    "orgChart": {
      "filename": "org-chart.pdf",
      "type": "application/pdf",
      "size": 245678,
      "data": "data:application/pdf;base64,JVBERi0xLj..."
    },
    "teamComp": null,
    "sops": {
      "filename": "sops.docx",
      "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "size": 123456,
      "data": "data:application/vnd.openxmlformats...;base64,..."
    },
    "financials": {
      "filename": "financials-2024.xlsx",
      "type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "size": 567890,
      "data": "data:application/vnd.openxmlformats...;base64,..."
    }
  }
}
```

### File Upload Details

- **Max file size**: 10MB per file
- **Accepted formats**: PDF, PNG, JPG, Excel (.xlsx, .xls), Word (.doc, .docx), CSV, TXT
- **Encoding**: Files are converted to base64 data URIs
- **Fields**: orgChart, teamComp, sops, financials

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no build step)
- **Fonts**: Plus Jakarta Sans (headings), DM Sans (body) via Google Fonts
- **Hosting**: Vercel (auto-deploys from GitHub)
- **Backend**: n8n webhook

## File Structure

```
audit_frontend/
├── index.html          # Main form (single file with embedded CSS/JS)
├── assets/
│   └── logo.jpg        # Agency Operators logo
├── README.md           # This file
└── PROJECT_RESUME.md   # Development context for future sessions
```

## Customization

### Changing Colors
Edit the CSS variables at the top of the `<style>` section:
```css
:root {
    --bg-page: #f8fafc;
    --bg-white: #ffffff;
    --accent-blue: #3b82f6;
    --accent-cyan: #06b6d4;
    --accent-green: #10b981;
    /* ... */
}
```

### Changing Logo
Replace `assets/logo.jpg` with your own logo file.

### Changing Webhook URL
Edit the CONFIG object in the `<script>` section:
```javascript
const CONFIG = {
    STORAGE_KEY: 'agency_audit_form_data',
    WEBHOOK_URL: 'https://your-webhook-url.com/webhook/endpoint',
    AUTOSAVE_DELAY: 1000
};
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Data Privacy

- Form data is stored in browser localStorage and persists across page refreshes
- Users can resume their form at any time (data stays until browser cache is cleared)
- File uploads do NOT persist in localStorage (only text fields)
- Data is only sent to the configured n8n webhook URL
- No third-party tracking or analytics included
- Files are sent as base64 (not stored externally)
