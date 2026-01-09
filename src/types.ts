export interface SafeInfo {
  address: string;
  owners: string[];
  threshold: number;
  nonce: number;
  masterCopy: string;
  fallbackHandler: string;
  guard: string | null;
  enabledModules: string[];
}

export interface OwnerSafesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SafeInfo[];
}

export interface SafeDetailsResponse {
  address: string;
  nonce: number;
  threshold: number;
  owners: string[];
  masterCopy: string;
  modules: string[];
  fallbackHandler: string;
  guard: string | null;
  version: string;
}

export interface OwnerWithName {
  address: string;
  name: string | null;
}

export interface SafeWithThreshold {
  address: string;
  threshold: number;
  totalOwners: number;
  name: string | null;
}

export interface SafeOwnersWithThreshold {
  safeAddress: string;
  safeName: string | null;
  owners: OwnerWithName[];
  threshold: number;
}