# eDNA Explorer

**Identifying Taxonomy and Assessing Biodiversity from eDNA Datasets**  
*Explore • Identify • Conserve*

eDNA Explorer is a full-stack environmental DNA research platform built with React, TypeScript, Tailwind CSS, Express, Firebase Authentication & Firestore, Supabase Storage & PostgreSQL, Recharts, jsPDF, and the Google Gemini API.

---

## 1. Project Setup

### Prerequisites
- Node.js `>= 20` (tested on Node `22.x`)
- A Firebase project (Authentication + Cloud Firestore)
- A Supabase project (Storage + PostgreSQL + Edge Functions)
- A Google Gemini API key (`GEMINI_API_KEY`)

### Install Dependencies & Run Locally
```bash
npm install
npm run dev
```
The Express + Vite full-stack server runs on `http://localhost:3000`.

### Build for Production
```bash
npm run build
npm start
```

---

## 2. Firebase Configuration

1. Client configuration is stored in `firebase-applet-config.json` (generated during Firebase provisioning).
2. Enable **Email/Password** and **Google** sign-in providers in the Firebase Console under **Authentication > Sign-in method**.
3. Ensure **Email Verification** templates are enabled so newly registered researchers receive verification links before accessing protected datasets.
4. On the server (`server.ts`), `firebase-admin` initializes with `projectId` from `firebase-applet-config.json` and verifies every API request's `Authorization: Bearer <idToken>` using `verifyIdToken(token)`.

---

## 3. Supabase Configuration

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Copy your Project URL and Service Role Key into server environment secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in client/browser code (`VITE_*`).
3. Create a private Storage bucket named `edna-datasets` (or run `supabase/schema.sql`, which creates it automatically).
4. Optional: Deploy the included Edge Function (`supabase/functions/process-edna/index.ts`):
   ```bash
   supabase functions deploy process-edna
   ```
   Set `SUPABASE_EDGE_FUNCTION_URL` in your server environment.

---

## 4. Gemini API Configuration

1. Obtain a Gemini API key and configure `GEMINI_API_KEY` in your server environment / AI Studio Secrets panel.
2. All `@google/genai` calls run strictly server-side via `POST /api/gemini/interpret` using `gemini-4-hydrogen`.
3. **Scientific Integrity Rule**: Gemini is constrained via `systemInstruction` to interpret only the verified biodiversity indices and taxonomic summaries passed from completed analyses—never fabricating species identifications from raw DNA sequences.

---

## 5. Environment Variables

See `.env.example` for all supported variables:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Server | Google Gemini API key for ecological metric interpretation |
| `APP_URL` | Server | Hosted application URL |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Supabase service-role key (never exposed to frontend) |
| `SUPABASE_STORAGE_BUCKET` | Server | Storage bucket for eDNA files (`edna-datasets`) |
| `SUPABASE_EDGE_FUNCTION_URL` | Server | Optional deployed Edge Function endpoint |
| `INITIAL_ADMIN_EMAIL` | Server | Verified email address of the bootstrapped administrator |
| `BLAST_PIPELINE_ENDPOINT` | Server | Optional external NCBI BLAST / SILVA / MIDORI alignment microservice |

---

## 6. Database Setup

### Firebase Firestore Collections
Defined in `firebase-blueprint.json` and enforced by `firestore.rules`:
- `users` — Researcher profiles, institution metadata, `role` (`user` | `admin`), `accountStatus`
- `admins` — Bootstrapped/authorized administrator registry
- `datasets` — Uploaded dataset metadata linked to `supabaseDatasetId` and `storagePath`
- `analyses` — Analysis parameters, status, and pipeline mode
- `results` — Taxonomic assignments, diversity metrics, and AI interpretations
- `notifications` — Upload and analysis status alerts
- `activity_logs` — Immutable user and admin action audit logs
- `reports` — Saved reports and controlled sharing settings

### Supabase PostgreSQL Tables
Run `/supabase/schema.sql` in the Supabase SQL Editor to create:
- `user_roles`
- `dataset_processing_jobs`
- `sequence_records`
- `taxonomic_assignments`
- `biodiversity_metrics`
- `analysis_logs`
- `admin_audit_logs`

---

## 7. Security Configuration

- **Firestore Security Rules** (`firestore.rules`):
  - Default-deny catch-all at root.
  - Strict email verification enforcement (`request.auth.token.email_verified == true`).
  - Self-registration strictly locked to `role: "user"` and `accountStatus: "active"`.
  - Users cannot modify their own `role` or `accountStatus`.
  - PII isolation on `users` and owner-scoped `list` queries (`resource.data.userId == request.auth.uid`).
- **Supabase Row Level Security (RLS)**: Enabled on all 7 tables and the `edna-datasets` Storage bucket.
- **Hidden Administrator Route** (`/secure-control`):
  - Not linked anywhere in public navigation, login, registration, or user dashboard.
  - Verified server-side via Firebase ID token + verified admin identity on every `/api/admin/*` request.
- **Rate Limiting & Upload Validation**: Applied to uploads, analysis runs, AI interpretations, and admin mutations.

---

## 8. Deployment Instructions

1. Ensure `firestore.rules` is deployed to your Firebase project (`firebase deploy --only firestore:rules`).
2. Execute `supabase/schema.sql` in Supabase SQL Editor.
3. Configure all environment secrets (`GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INITIAL_ADMIN_EMAIL`).
4. Build and start the production server:
   ```bash
   npm run build
   npm start
   ```
