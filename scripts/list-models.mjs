import OpenAI from 'openai';
import fs from 'node:fs';
import path from 'node:path';

// Automatically load .env.local if present
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  if (typeof process.loadEnvFile === 'function') {
    try {
      process.loadEnvFile(envLocalPath);
    } catch {
      // Fallback if loadEnvFile has quirks
    }
  }
}

const apiKey = process.env.NEBIUS_API_KEY;
const baseURL = process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.nebius.com/v1/';

if (!apiKey) {
  console.error('\x1b[31m[ERROR] NEBIUS_API_KEY is not set.\x1b[0m');
  console.error('Please create a .env.local file in the project root containing:');
  console.error('  NEBIUS_API_KEY=your_token_factory_key_here');
  console.error('  NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/');
  process.exit(1);
}

console.log(`Connecting to Nebius Token Factory at: ${baseURL}`);
console.log('Querying available models...\n');

const client = new OpenAI({
  apiKey,
  baseURL,
});

async function main() {
  try {
    const list = await client.models.list();
    const allModels = list.data.map((m) => m.id).sort();

    console.log(`Total models available: ${allModels.length}\n`);

    const nemotronModels = allModels.filter((id) =>
      id.toLowerCase().includes('nemotron') || id.toLowerCase().includes('nvidia')
    );

    console.log('\x1b[32m=== NVIDIA / NEMOTRON MODELS (FOUND) ===\x1b[0m');
    if (nemotronModels.length === 0) {
      console.log('No models with "nemotron" or "nvidia" in their ID were returned.');
    } else {
      for (const id of nemotronModels) {
        console.log(`  * \x1b[36m${id}\x1b[0m`);
      }
    }

    console.log('\n\x1b[33m=== ALL AVAILABLE MODELS ===\x1b[0m');
    for (const id of allModels) {
      console.log(`  - ${id}`);
    }

    console.log('\n\x1b[32m[SUCCESS] Token Factory connectivity confirmed.\x1b[0m');
    console.log('Tip: Copy the best model IDs into your .env.local for NEBIUS_MODEL_PRIMARY and NEBIUS_MODEL_FAST.');
  } catch (error) {
    console.error('\x1b[31m[FAILURE] Error connecting to Nebius Token Factory:\x1b[0m');
    console.error(error.message || error);
    if (error.status === 401) {
      console.error('Hint: 401 Unauthorized - verify your NEBIUS_API_KEY in .env.local.');
    }
    process.exit(1);
  }
}

main();
