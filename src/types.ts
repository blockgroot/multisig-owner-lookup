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