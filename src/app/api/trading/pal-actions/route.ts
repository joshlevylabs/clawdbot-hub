import { NextRequest } from "next/server";
import { handleAdvisorRequest } from '@/lib/trading/advisor-api';
import { PAL_SYSTEM_PROMPT } from '@/lib/raoul-pal-knowledge';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handleAdvisorRequest(request, {
    name: 'Raoul Pal',
    supabaseId: 'raoul-pal',
    systemPrompt: PAL_SYSTEM_PROMPT,
    knowledgeVersion: 'raoul-pal-v1',
  });
}
