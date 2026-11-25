# eDNA Explorer — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Role Isolation**: Newly registered users must always receive `role: "user"` and `accountStatus: "active"`. Self-escalation to `role: "admin"` on `create` or `update` is strictly forbidden.
2. **Email Verification Gate**: All standard mutations and reads on `datasets`, `analyses`, `results`, `notifications`, `activity_logs`, and `reports` require `request.auth.token.email_verified == true`.
3. **Owner-Bound Creation & Relational Integrity**: An `analysis` document can only be created if the referenced `datasetId` exists and belongs to `request.auth.uid`. A `result` document can only be created if the referenced `analysisId` exists and belongs to `request.auth.uid`.
4. **Immortal Identity & Timestamp Fields**: `userId`, `uid`, `createdAt`, `datasetId`, `analysisId` cannot be reassigned on `update`. `createdAt` and `updatedAt` must equal `request.time`.
5. **Terminal State Locking**: Once an `analysis` reaches `status == "completed"`, ordinary users cannot mutate its core fields; only admins can re-open or retry jobs.
6. **PII Isolation**: User documents containing `email` and `institution` are readable only by the owning `uid` or a verified administrator. Blanket `list` queries on `users` by ordinary users are denied.
7. **Controlled Report Sharing**: Shared reports (`isShared == true`) can be read via explicit `get` by `reportId`, while `list` remains strictly scoped to `resource.data.userId == request.auth.uid`.

## 2. Dirty Dozen Payloads (Expected: PERMISSION_DENIED)
1. **Self-Admin Registration**: `POST /users/{uid}` with `{ role: "admin", ... }` by non-bootstrapped user.
2. **Role Escalation Update**: `PATCH /users/{uid}` changing `role` from `"user"` to `"admin"`.
3. **Ghost Shadow Field**: `POST /datasets/{id}` including an unexpected field `isVerified: true`.
4. **Unverified Email Spoof**: Request with `email: "kritikaanoushka@gmail.com"` and `email_verified: false`.
5. **Cross-User Dataset Read**: User B calling `get /datasets/{userADatasetId}`.
6. **Blanket User List Scrape**: Ordinary user calling `list /users`.
7. **Orphaned Analysis Creation**: User B creating an analysis referencing User A's `datasetId`.
8. **ID Poisoning Attack**: Writing a document with a 256-char ID containing `../$ne`.
9. **Client Timestamp Spoofing**: Creating a dataset with backdated `createdAt` != `request.time`.
10. **Immutable Log Tampering**: Updating or deleting an entry in `/activity_logs/{logId}`.
11. **Completed Analysis Tampering**: User modifying `status` or `datasetId` on a `completed` analysis.
12. **Type/Size Poisoning**: Updating `datasetName` with a 50KB string or boolean value.
