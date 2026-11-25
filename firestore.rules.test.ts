/**
 * Phase 0 Security Rule Verification Matrix for eDNA Explorer.
 * Documents and verifies all 12 Dirty Dozen adversarial payloads against firestore.rules invariants.
 */

export interface DirtyDozenCase {
  id: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  attackVector: string;
  expectedResult: 'PERMISSION_DENIED';
  enforcedByRule: string;
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 'DD-01',
    collection: 'users',
    operation: 'create',
    attackVector: 'Self-assign role: "admin" during registration',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "incoming().role == 'user' && incoming().accountStatus == 'active'",
  },
  {
    id: 'DD-02',
    collection: 'users',
    operation: 'update',
    attackVector: 'User updates own role to "admin" or accountStatus',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().role == existing().role && affectedKeys().hasOnly(...)',
  },
  {
    id: 'DD-03',
    collection: 'datasets',
    operation: 'create',
    attackVector: 'Shadow field injection (e.g., isVerified: true)',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidDataset(incoming()) -> keys().hasOnly(...)',
  },
  {
    id: 'DD-04',
    collection: 'admins',
    operation: 'get',
    attackVector: 'Email spoofing with email_verified == false',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isVerified() requires request.auth.token.email_verified == true',
  },
  {
    id: 'DD-05',
    collection: 'datasets',
    operation: 'get',
    attackVector: 'Cross-tenant read of another user dataset',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'existing().userId == request.auth.uid || isAdmin()',
  },
  {
    id: 'DD-06',
    collection: 'users',
    operation: 'list',
    attackVector: 'Blanket collection list scraping PII across users',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'allow list: if isBootstrappedAdmin()',
  },
  {
    id: 'DD-07',
    collection: 'analyses',
    operation: 'create',
    attackVector: 'Orphaned analysis referencing another user datasetId',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'exists(/datasets/$(datasetId)) && get(...).data.userId == request.auth.uid',
  },
  {
    id: 'DD-08',
    collection: 'datasets',
    operation: 'create',
    attackVector: 'Path variable ID poisoning (oversized or invalid characters)',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "isValidId(datasetId) -> size <= 128 && matches('^[a-zA-Z0-9_\\\\-]+$')",
  },
  {
    id: 'DD-09',
    collection: 'datasets',
    operation: 'create',
    attackVector: 'Timestamp spoofing with createdAt != request.time',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'incoming().createdAt == request.time',
  },
  {
    id: 'DD-10',
    collection: 'activity_logs',
    operation: 'update',
    attackVector: 'Audit trail modification by authenticated user',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'allow update: if false',
  },
  {
    id: 'DD-11',
    collection: 'analyses',
    operation: 'update',
    attackVector: 'Mutating terminal completed analysis record',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: "existing().status != 'completed' || isAdmin()",
  },
  {
    id: 'DD-12',
    collection: 'datasets',
    operation: 'update',
    attackVector: 'Type or oversized string poisoning on allowed update key',
    expectedResult: 'PERMISSION_DENIED',
    enforcedByRule: 'isValidDataset(incoming()) enforces type & maxLength on all fields',
  },
];
