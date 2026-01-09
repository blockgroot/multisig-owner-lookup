import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from "axios";
import { getAddress } from "ethers";
import { SAFE_NETWORKS, NETWORK_TO_CHAIN_ID, NETWORK_TO_SAFE_APP } from "../src/networks";
import { OwnerSafesResponse, SafeDetailsResponse, SafeWithThreshold, SafeOwnersWithThreshold } from "../src/types";
import { ADDRESS_BOOK_INDEX } from "../safe-address-book-2026-01-13";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry<T>(
  url: string,
  headers: Record<string, string>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get<T>(url, { headers });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw error;
      }
      if (attempt === maxRetries) {
        throw error;
      }
      await delay(500);
    }
  }
  throw new Error("Max retries reached");
}

async function getSafesByOwner(owner: string) {
  const normalizedOwner = getAddress(owner);
  const result: Record<string, SafeWithThreshold[]> = {};
  const apiKey = process.env.SAFE_API_KEY;

  if (!apiKey) {
    throw new Error("SAFE_API_KEY is not set");
  }

  for (const [network, baseUrl] of Object.entries(SAFE_NETWORKS)) {
    try {
      const url = `${baseUrl}/api/v2/owners/${normalizedOwner}/safes/`; 
      const data = await fetchWithRetry<OwnerSafesResponse>(url, {
        "Authorization": `Bearer ${apiKey}`
      });

      if (data.results && data.results.length > 0) {
        const chainId = NETWORK_TO_CHAIN_ID[network];
        const addressBook = ADDRESS_BOOK_INDEX[chainId] || {};
        
        result[network] = data.results.map(safe => {
          const normalizedSafe = safe.address.toLowerCase();
          const safeName = addressBook[normalizedSafe] || null;
          return {
            address: safe.address,
            threshold: safe.threshold,
            totalOwners: safe.owners.length,
            name: safeName
          };
        });
      }
    } catch (error: any) {
      // Only log non-404 errors (404 means no safes found, which is normal)
      if (error.response?.status !== 404) {
        console.error(`❌ ${network}: ${error.message}`);
      }
    }
  }

  return result;
}

async function getOwnersBySafe(safeAddress: string) {
  const normalizedSafe = getAddress(safeAddress);
  const result: Record<string, SafeOwnersWithThreshold> = {};
  const apiKey = process.env.SAFE_API_KEY;

  if (!apiKey) {
    throw new Error("SAFE_API_KEY is not set");
  }

  const networks = Object.keys(SAFE_NETWORKS);
  console.log(`Searching Safe ${normalizedSafe} across ${networks.length} networks: ${networks.join(', ')}`);

  for (const [network, baseUrl] of Object.entries(SAFE_NETWORKS)) {
    try {
      console.log(`Checking ${network}...`);
      const url = `${baseUrl}/api/v1/safes/${normalizedSafe}/`;
      const data = await fetchWithRetry<SafeDetailsResponse>(url, {
        "Authorization": `Bearer ${apiKey}`
      });

      if (data.owners && data.owners.length > 0) {
        console.log(`✓ Found Safe on ${network} with ${data.owners.length} owners`);
        const chainId = NETWORK_TO_CHAIN_ID[network];
        const addressBook = ADDRESS_BOOK_INDEX[chainId] || {};
        
        const normalizedSafeAddr = normalizedSafe.toLowerCase();
        const safeName = addressBook[normalizedSafeAddr] || null;
        
        result[network] = {
          safeAddress: normalizedSafe,
          safeName: safeName,
          threshold: data.threshold,
          owners: data.owners.map(owner => {
            const normalizedOwner = owner.toLowerCase();
            const name = addressBook[normalizedOwner] || null;
            return {
              address: owner,
              name: name
            };
          })
        };
      } else {
        console.log(`- No owners found on ${network}`);
      }
    } catch (error: any) {
      // Only log non-404 errors (404 means Safe doesn't exist on this network, which is normal)
      if (error.response?.status === 404) {
        console.log(`- Safe not found on ${network} (404)`);
      } else {
        console.error(`❌ ${network}: ${error.message}`);
      }
    }
  }

  console.log(`Search complete. Found on ${Object.keys(result).length} network(s): ${Object.keys(result).join(', ')}`);
  return result;
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  const { address, type } = request.query;

  if (!address || typeof address !== 'string') {
    return response.status(400).json({ error: 'Address parameter is required' });
  }

  const lookupType = type === 'safe' ? 'safe' : 'owner';

  try {
    if (lookupType === 'safe') {
      const owners = await getOwnersBySafe(address);
      return response.status(200).json({ owners });
    } else {
      const safes = await getSafesByOwner(address);
      return response.status(200).json({ safes });
    }
  } catch (error: any) {
    console.error('Error:', error);
    return response.status(500).json({ error: error.message || 'Internal server error' });
  }
}
