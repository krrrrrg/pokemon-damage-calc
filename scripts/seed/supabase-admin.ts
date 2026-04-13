import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE env vars. Check .env.local (need SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

// 시드 스크립트는 service_role key 사용 (RLS 우회)
export const supabase = createClient(url, serviceKey);

export async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchJson(url: string, retries = 3): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 404) throw new Error(`404 ${url}`); // 404는 재시도 안 함
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.json();
    } catch (err: any) {
      // 404나 마지막 시도면 바로 throw
      if (err.message?.startsWith("404") || attempt === retries) throw err;
      console.log(`  재시도 ${attempt}/${retries}: ${url}`);
      await sleep(1000 * attempt);
    }
  }
}
