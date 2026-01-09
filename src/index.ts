import axios from "axios";
import { getAddress } from "ethers";
import dotenv from "dotenv";
import { SAFE_NETWORKS } from "./networks";
import { OwnerSafesResponse } from "./types";

dotenv.config();

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
    throw new Error("SAFE_API_KEY is not set in .env file");
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

// ---------- CLI usage ----------
const address = process.argv[2];

if (!address) {
  console.error("❗ Usage: npx ts-node src/index.ts <wallet-address>");
  process.exit(1);
}

(async () => {
  console.log(`\n🔍 Scanning Safes for owner: ${address}\n`);

  const safes = await getSafesByOwner(address);

  if (Object.keys(safes).length === 0) {
    console.log("No Safe multisigs found.");
    return;
  }

  for (const [network, safeList] of Object.entries(safes)) {
    console.log(`🔗 ${network.toUpperCase()}`);
    safeList.forEach((safe) => console.log(`  - ${safe}`));
    console.log("");
  }
})();
