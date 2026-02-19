# Agency Operators Audit Form - Project Resume

> Last updated: January 15, 2026

## Quick Context

A single-page web form for collecting comprehensive agency audit data from Kyle's Agency Operators coaching clients. Sends structured JSON (including base64 file uploads) to an n8n webhook. Currently debugging file upload issues where files arrive as `null` in n8n.

## Current State

### What's Working
- Form submission sends JSON payload to n8n webhook
- Text field data arrives correctly
- PNG file uploads work and return base64
- Form data persists in localStorage across refreshes
- Sidebar navigation with scroll-spy
- Progress bar tracking

### Current Issue Being Debugged
- **Problem**: File uploads (PDF, Excel, etc.) arrive as `null` in n8n
- **Working**: PNG files work correctly
- **Symptom**: UI glitches requiring double-upload
- **Status**: Added comprehensive debug logging (commit `ef0db2b`) - waiting for test results

### Tech Stack
- **Frontend**: Vanilla HTML/CSS/JS (single file, no build step)
- **Fonts**: Plus Jakarta Sans (headings), DM Sans (body) via Google Fonts
- **Hosting**: Vercel (auto-deploys from GitHub on push)
- **Backend**: n8n webhook at `https://agencyoperators123.app.n8n.cloud/webhook/audit-btb`

## Live URLs

| Environment | URL |
|-------------|-----|
| **Production** | https://agency-ops-audit.vercel.app |
| **GitHub** | https://github.com/benreeder-coder/agency-operators-audit |
| **Webhook** | https://agencyoperators123.app.n8n.cloud/webhook/audit-btb |

## File Structure

```
audit_frontend/
├── index.html          # Main form (92KB - embedded CSS/JS)
├── assets/
│   └── logo.jpg        # Agency Operators logo
├── README.md           # User documentation
├── PROJECT_RESUME.md   # This file (dev context)
├── .vercel/            # Vercel project config
└── .git/               # Git repository
```

## Key Code Locations (index.html)

### Configuration
- **CONFIG object**: `index.html:1513-1517` - webhook URL, storage key, autosave delay
- **File fields array**: `index.html:1541` - `['orgChartFile', 'teamCompFile', 'sopsFile', 'financialsFile']`
- **Max file size**: `index.html:1542` - 10MB limit

### File Upload System
- **uploadedFiles object**: `index.html:1533-1538` - stores file data in memory
- **setupFileUploads()**: `index.html:1587-1668` - event handlers for click/drag/drop
- **handleFileSelect()**: `index.html:1670-1702` - reads file to base64, stores in uploadedFiles
- **removeFile()**: `index.html:1704-1716` - clears file from uploadedFiles

### Form Submission
- **getFormDataAsJSON()**: `index.html:1726-1798` - serializes all fields + files to JSON
- **Form submit handler**: `index.html:1973-2032` - sends payload to webhook

### UI Components
- **Scroll spy**: `index.html:1916-1936` - highlights current section in sidebar
- **Mobile menu**: `index.html:1938-1949` - toggles sidebar on mobile
- **Auto-save**: `index.html:1576-1584` - debounced save to localStorage

## Recent Changes

| Commit | Description |
|--------|-------------|
| `ef0db2b` | Add file upload debugging and error handling (current) |
| `2ed2252` | Update documentation with all session changes |
| `6923f2c` | Enable form persistence across page refreshes |
| `c2a5bf8` | Simplify Voice of Data to 12-month averages |
| `563a69b` | Add file uploads and send all webhook fields |
| `9fca2b4` | Initial commit |

### Latest Changes (ef0db2b)
Added comprehensive debugging for file upload issue:
- FileReader `onerror`/`onabort` handlers to catch silent failures
- Console logging with `[FileUpload]` prefix for all file operations
- Console logging with `[Submit]` prefix for submission details
- `input.value = ''` reset to fix double-click glitch
- `e.stopPropagation()` on all event handlers
- Payload size logging before webhook send

## Known Issues / Future Work

### Active Issue
- [ ] **File uploads arriving as null** - Files (except PNG) show as `null` in n8n webhook. Debug logging added, awaiting test results.

### Potential Causes (to investigate)
- FileReader silently failing for certain MIME types
- Event handlers firing twice (double-click issue)
- n8n payload size limits being exceeded
- Base64 encoding issues for non-image files

### Future Enhancements
- [ ] Switch from JSON+base64 to FormData/multipart if needed
- [ ] Multiple file uploads per field
- [ ] File upload progress indicator
- [ ] Form validation before submit
- [ ] Success redirect after submission

## How to Continue

### Setup
```bash
cd "c:\Users\breed\OneDrive\Desktop\Claude Code UPD\Kyle Chatbot\audit_frontend"
```

### Test the Debug Logging
1. Visit https://agency-ops-audit.vercel.app (wait 1-2 min after push for deploy)
2. Open browser DevTools → Console
3. Upload various file types (PDF, Excel, PNG)
4. Watch for `[FileUpload]` logs showing file processing
5. Submit form and watch `[Submit]` logs showing payload details
6. Check n8n webhook to see if files arrive

### Make Changes
1. Edit `index.html`
2. Commit and push:
```bash
git add -A
git commit -m "Description of changes"
git push
```
3. Vercel auto-deploys in ~1-2 minutes

## Webhook Payload Structure

```json
{
  "submitted_at": "ISO timestamp",
  "contact": { /* 6 fields */ },
  "strategy": { /* 9 fields */ },
  "goals": { /* 7 fields */ },
  "lead_generation": { /* 3 fields */ },
  "lead_nurture": { /* 2 fields */ },
  "sales": { /* 3 fields */ },
  "recruiting": { /* 5 fields */ },
  "operations": { /* 5 fields */ },
  "financials": {},
  "voice_of_data": {
    "monthly_averages": { /* 7 fields */ },
    "averages": { /* 16 fields */ }
  },
  "action_plan": { /* 2 fields */ },
  "files": {
    "orgChart": { filename, type, size, data } | null,
    "teamComp": { ... } | null,
    "sops": { ... } | null,
    "financials": { ... } | null
  }
}
```

## Debug Console Output (Expected)

When working correctly, you should see:
```
[FileUpload] Setting up file upload handlers for fields: [...]
[FileUpload] Zone clicked for orgChartFile
[FileUpload] Starting file selection for orgChartFile: { name: "...", type: "...", size: ... }
[FileUpload] Starting FileReader.readAsDataURL for orgChartFile
[FileUpload] Successfully read file for orgChartFile, data length: 12345
[FileUpload] Stored in uploadedFiles[orgChartFile]: { filename: "...", ... }
[Submit] Form submission started
[Submit] Current uploadedFiles state: { orgChartFile: {...}, ... }
[Submit] Payload size: 123.45 KB (0.12 MB)
[Submit] Files in payload: { orgChart: { filename: "...", hasData: true }, ... }
[Submit] Sending to webhook: https://...
[Submit] Response status: 200
[Submit] Submission successful!
```

If files show `null`, the debug logs will help identify where the chain breaks.

---

*Last updated: January 15, 2026*
*Session: Fixed file upload debugging and error handling*
