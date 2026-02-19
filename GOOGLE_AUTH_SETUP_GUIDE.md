# Google Auth Setup Guide for Agency Operators Audit

This guide walks you through enabling Google Sign-In for the audit frontend. Two systems need to be configured: Google Cloud Console and Supabase.

---

## Part 1: Create Google OAuth Credentials

1. Go to https://console.cloud.google.com
2. Sign in with your Google account (the one that owns the project)
3. In the top-left dropdown next to "Google Cloud", select an existing project or click **New Project**
   - Project name: `Agency Operators Audit` (or any name)
   - Click **Create**
4. In the left sidebar, go to **APIs & Services** > **Credentials**
5. If you see a banner saying "To create an OAuth client ID, you must first configure your consent screen", click **Configure Consent Screen** and follow these steps:
   - Select **External**, click **Create**
   - App name: `Agency Operators Audit`
   - User support email: select your email
   - Scroll to bottom, add your email under Developer contact information
   - Click **Save and Continue**
   - On the Scopes page, click **Save and Continue** (no changes needed)
   - On the Test Users page, click **Save and Continue** (no changes needed)
   - Click **Back to Dashboard**
   - Go back to **APIs & Services** > **Credentials**
6. Click **+ Create Credentials** (button at top) > **OAuth client ID**
7. Application type: **Web application**
8. Name: `Supabase Auth`
9. Skip "Authorized JavaScript origins"
10. Under **Authorized redirect URIs**, click **+ Add URI** and paste exactly:

```
https://zhhikvjopuylxuxbbedg.supabase.co/auth/v1/callback
```

11. Click **Create**
12. A popup will show your **Client ID** and **Client Secret**. Copy both somewhere safe. You need them for Part 2.

---

## Part 2: Enable Google in Supabase

1. Go to https://supabase.com/dashboard/project/zhhikvjopuylxuxbbedg
2. Left sidebar: **Authentication** > **Providers**
3. Click **Google** to expand it
4. Toggle **Enable Sign in with Google** to ON
5. Paste the **Client ID** from Part 1 into the **Client IDs** field
6. Paste the **Client Secret** from Part 1 into the **Client Secret (for OAuth)** field
7. Leave "Skip nonce checks" OFF
8. Leave "Allow users without an email" OFF
9. Click **Save**

---

## Part 3: Configure Redirect URLs in Supabase

1. Still in Supabase dashboard, left sidebar: **Authentication** > **URL Configuration**
2. Set **Site URL** to:

```
https://auditfrontend-1qf483fcx-ben-reeders-projects.vercel.app
```

3. Under **Redirect URLs**, click **Add URL** and add:

```
https://auditfrontend-1qf483fcx-ben-reeders-projects.vercel.app/form.html
```

4. Click **Save**

---

## Verification

1. Open https://auditfrontend-1qf483fcx-ben-reeders-projects.vercel.app
2. Click **Sign in with Google**
3. Complete the Google sign-in flow
4. You should be redirected to the audit form, with your name and avatar in the sidebar

If you get a "redirect_uri_mismatch" error, double-check that the callback URL in Google Cloud Console (Part 1, step 10) matches exactly: `https://zhhikvjopuylxuxbbedg.supabase.co/auth/v1/callback`
