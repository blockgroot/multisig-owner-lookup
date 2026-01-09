import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from "axios";
import { getAddress } from "ethers";
import { SAFE_NETWORKS } from "../src/networks";
import { OwnerSafesResponse } from "../src/types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  maxRetries: number = 3
): Promise<OwnerSafesResponse> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get<OwnerSafesResponse>(url, { headers });
      return response.data;
    } catch (error: any) {
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
  const result: Record<string, string[]> = {};
  const apiKey = process.env.SAFE_API_KEY;

  if (!apiKey) {
    throw new Error("SAFE_API_KEY is not set");
  }

  for (const [network, baseUrl] of Object.entries(SAFE_NETWORKS)) {
    try {
      const url = `${baseUrl}/api/v2/owners/${normalizedOwner}/safes/`; 
      const data = await fetchWithRetry(url, {
        "Authorization": `Bearer ${apiKey}`
      });

      if (data.results && data.results.length > 0) {
        result[network] = data.results.map(safe => safe.address);
      }
    } catch (error: any) {
      console.error(`❌ ${network}: ${error.message}`);
    }
  }

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

  const { address } = request.query;

  if (!address || typeof address !== 'string') {
    return response.status(400).json({ error: 'Address parameter is required' });
  }

  try {
    const safes = await getSafesByOwner(address);
    return response.status(200).json({ safes });
  } catch (error: any) {
    console.error('Error:', error);
    return response.status(500).json({ error: error.message || 'Internal server error' });
  }
}
