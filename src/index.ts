import axios from "axios";
import { getAddress } from "ethers";
import dotenv from "dotenv";
import { SAFE_NETWORKS, NETWORK_TO_CHAIN_ID, NETWORK_TO_SAFE_APP } from "./networks";
import { OwnerSafesResponse, SafeDetailsResponse, SafeWithThreshold, SafeOwnersWithThreshold } from "./types";
import { ADDRESS_BOOK_INDEX } from "../safe-address-book-2026-01-13";

dotenv.config();

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
      // Don't retry on 404 - Safe/owner doesn't exist on this network
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
    throw new Error("SAFE_API_KEY is not set in .env file");
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
    throw new Error("SAFE_API_KEY is not set in .env file");
  }

  const networks = Object.keys(SAFE_NETWORKS);
  console.log(`\nSearching Safe ${normalizedSafe} across ${networks.length} networks: ${networks.join(', ')}\n`);

  for (const [network, baseUrl] of Object.entries(SAFE_NETWORKS)) {
    try {
      process.stdout.write(`  Checking ${network}... `);
      const url = `${baseUrl}/api/v1/safes/${normalizedSafe}/`;
      const data = await fetchWithRetry<SafeDetailsResponse>(url, {
        "Authorization": `Bearer ${apiKey}`
      });

      if (data.owners && data.owners.length > 0) {
        console.log(`✓ Found ${data.owners.length} owner(s)`);
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
        console.log(`- No owners found`);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.log(`- Not found (404)`);
      } else {
        console.log(`❌ ${error.message}`);
      }
    }
  }

  console.log(`\nSearch complete. Found on ${Object.keys(result).length} network(s).\n`);
  return result;
}

// ---------- CLI usage ----------
const lookupType = process.argv[2];
const address = process.argv[3];

if (!lookupType || !address) {
  console.error("❗ Usage:");
  console.error("  Owner lookup: npx ts-node src/index.ts owner <wallet-address>");
  console.error("  Safe lookup:  npx ts-node src/index.ts safe <safe-address>");
  process.exit(1);
}

(async () => {
  if (lookupType === 'safe') {
    console.log(`\n🔍 Scanning owners for Safe: ${address}\n`);

    const owners = await getOwnersBySafe(address);

    if (Object.keys(owners).length === 0) {
      console.log("No owners found for this Safe address on any network.");
      return;
    }

    for (const [network, safeData] of Object.entries(owners)) {
      const safeNameDisplay = safeData.safeName ? ` | Name: ${safeData.safeName}` : '';
      const safeAppUrl = `https://app.safe.global/home?safe=${NETWORK_TO_SAFE_APP[network]}:${safeData.safeAddress}`;
      console.log(`🔗 ${network.toUpperCase()} - Safe: ${safeData.safeAddress} (Threshold: ${safeData.threshold}/${safeData.owners.length})${safeNameDisplay}`);
      console.log(`    🔗 ${safeAppUrl}`);
      safeData.owners.forEach((owner) => {
        const nameDisplay = owner.name ? ` | Name: ${owner.name}` : '';
        console.log(`  - ${owner.address}${nameDisplay}`);
      });
      console.log("");
    }
  } else if (lookupType === 'owner') {
    console.log(`\n🔍 Scanning Safes for owner: ${address}\n`);

    const safes = await getSafesByOwner(address);

    if (Object.keys(safes).length === 0) {
      console.log("No Safe multisigs found.");
      return;
    }

    for (const [network, safeList] of Object.entries(safes)) {
      console.log(`🔗 ${network.toUpperCase()}`);
      safeList.forEach((safe) => {
        const safeAppUrl = `https://app.safe.global/home?safe=${NETWORK_TO_SAFE_APP[network]}:${safe.address}`;
        const nameDisplay = safe.name ? ` (${safe.name})` : '';
        console.log(`  - ${safe.address} (Threshold: ${safe.threshold}/${safe.totalOwners})${nameDisplay}`);
        console.log(`    🔗 ${safeAppUrl}`);
      });
      console.log("");
    }
  } else {
    console.error("❗ Invalid lookup type. Use 'owner' or 'safe'");
    process.exit(1);
  }
})();
