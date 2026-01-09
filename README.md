# Agency Operators - Full Agency Audit Form

A modern, single-page web form for collecting comprehensive agency audit data. Built with vanilla HTML/CSS/JS for easy deployment.

## Features

- **Single Page Design**: All 11 sections on one scrollable page for easy reference
- **Auto-Save**: Form progress saved to localStorage automatically
- **Progress Tracking**: Visual "Level Up" progress bar shows completion percentage
- **Section Navigation**: Sticky sidebar with scroll-spy highlighting
- **Mobile Responsive**: Works on desktop, tablet, and mobile
- **n8n Integration**: Sends structured JSON to your n8n webhook on submission

## Quick Start

1. **Host the files**: Upload the `audit_frontend` folder to any web server or hosting service
2. **Configure webhook**: Enter your n8n webhook URL in the configuration banner at the top of the form
3. **Share the link**: Send the form URL to your clients

## n8n Webhook Setup

### Option 1: Configure via URL Parameter

Add your webhook URL as a query parameter:
```
https://your-domain.com/audit_frontend/?webhook=https://your-n8n.com/webhook/abc123
```

### Option 2: Configure in the Form

Clients can enter the webhook URL in the configuration banner at the top of the form.

### n8n Workflow Setup

1. Create a new workflow in n8n
2. Add a **Webhook** node as the trigger
3. Configure it to accept POST requests
4. The form will send JSON data structured like this:

```json
{
  "submitted_at": "2024-01-09T12:00:00.000Z",
  "contact": {
    "yourName": "...",
    "yourEmail": "...",
    "yourPhone": "...",
    "companyName": "...",
    "personalAddress": "...",
    "preferredContact": "..."
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
    "clientCountries": "...",
    "orgChart": "..."
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
    "projectManagement": "...",
    "teamCompLink": "...",
    "sopsLink": "..."
  },
  "financials": {
    "financialsLink": "..."
  },
  "voice_of_data": {
    "monthly_metrics": {
      "referrals": { "jan": "...", "feb": "...", ... },
      "leads": { "jan": "...", "feb": "...", ... },
      "clients": { "jan": "...", "feb": "...", ... },
      "churn": { "jan": "...", "feb": "...", ... },
      "employees": { "jan": "...", "feb": "...", ... },
      "revenue": { "jan": "...", "feb": "...", ... },
      "profit": { "jan": "...", "feb": "...", ... }
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
  }
}
```

## Deployment Options

### Option 1: Static Hosting (Recommended)
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

### Option 2: Web Server
Upload to any web server (Apache, Nginx, etc.)

### Option 3: Local Testing
Open `index.html` directly in a browser (webhook submission requires CORS to be handled)

## Customization

### Changing Colors
Edit the CSS variables at the top of the `<style>` section:
```css
:root {
    --bg-dark: #0a0a0f;
    --accent-blue: #3b82f6;
    --accent-cyan: #06b6d4;
    --accent-yellow: #fbbf24;
    --accent-pink: #ec4899;
    /* ... */
}
```

### Changing Logo
Replace `assets/logo.jpg` with your own logo file.

### Adding/Removing Fields
Edit the HTML form sections. Each section follows this pattern:
```html
<section class="form-section" id="sectionId">
    <div class="section-header">...</div>
    <div class="form-card">
        <div class="form-group">
            <label class="form-label" for="fieldName">Field Label</label>
            <input type="text" class="form-input" id="fieldName" name="fieldName">
        </div>
    </div>
</section>
```

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Data Privacy
- Form data is stored in the browser's localStorage until submitted
- Data is only sent to the configured n8n webhook URL
- No third-party tracking or analytics included
