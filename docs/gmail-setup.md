cale# Setting up Gmail sending

The app sends email through each owner's own Gmail (Gmail API, "send email" permission only). A SuperAdmin's connected Gmail is the **system sender** for signup codes, password resets and the contact form, and covers owners who haven't connected. With nothing connected, messages are only logged to the backend console.

## One-time Google Cloud setup (you, once)
1. Go to <https://console.cloud.google.com>, create a project (e.g. "Rental Property Manager").
2. **APIs & Services -> Library** -> search **Gmail API** -> **Enable**.
3. **APIs & Services -> OAuth consent screen** (may be called *Google Auth Platform*):
   - User type **External**, fill in app name, support email, developer email.
   - **Scopes / Data access** -> add `.../auth/gmail.send` (and the default `openid`, `email`).
   - Publishing status stays **Testing**. Under **Test users**, add the Gmail address of every person who will connect (yourself, each owner you want to try).
4. **APIs & Services -> Credentials -> Create credentials -> OAuth client ID** -> type **Web application**.
   - Authorized redirect URIs (exact): `http://localhost:8001/api/email/google/callback` and `https://backend-production-933a.up.railway.app/api/email/google/callback`.
   - Copy the **Client ID** and **Client secret**.
5. Set on the backend (locally in `backend/.env`, on Railway as service variables):
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` (`http://localhost:8001/api/email/google/callback` locally, `https://backend-production-933a.up.railway.app/api/email/google/callback` on Railway), `EMAIL_TOKEN_KEY` (`openssl rand -base64 32`). Also set `ADMIN_URL` (`https://admin-production-bbad.up.railway.app`) and `FRONTEND_URL` (`https://frontend-production-c0d1.up.railway.app`): they turn into the buttons in emails ("Review this booking" for owners, "View my booking" for guests). Without them the emails still send, just without links. The backend's `CLIENT_URLS` must already include the admin URL, since the connect flow checks against it. Redeploy.
6. Sign in to the admin as the SuperAdmin -> **Settings -> Email -> Connect Gmail**. That is now the system sender.

Owners then do only: **Settings -> Email -> Connect Gmail -> pick account -> Allow**.

## Testing-mode limits (until Google verifies the app)
- Only listed test users (max 100) can connect.
- They see "Google hasn't verified this app": **Advanced -> Go to <app> (unsafe)**.
- Google expires the connection after **7 days**; Settings shows **Reconnect needed** and mail falls back to the system sender until they reconnect.

## Moving to production (needed before real owners)
1. Own a domain; host a public homepage and privacy policy on it (privacy policy must say what Gmail access is used for: sending booking emails only).
2. Add the domain under OAuth consent screen -> authorized domains, and verify it in Google Search Console.
3. Publish the app and submit for verification (sensitive scope `gmail.send`; Google asks for a short demo video). Review takes days to weeks.
4. Once verified: no warning screen, connections no longer expire weekly.

## Limits and behavior worth knowing
- Consumer Gmail allows about 500 sends/day per account (Workspace about 2,000). The system sender carries signup codes for everyone, so watch this as you grow.
- Sends never block a request: failures are recorded in the `EmailLog` table (status, error, no message bodies).
- If Google rejects a saved connection, it's marked "Reconnect needed" and that send retries through the system sender.
- Local testing without Google: set `EMAIL_DRY_RUN=true` to print the full message instead of sending.
