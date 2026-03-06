import { NextRequest } from "next/server";
import { handleAdvisorRequest } from '@/lib/trading/advisor-api';
import { DALIO_SYSTEM_PROMPT } from '@/lib/ray-dalio-knowledge';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handleAdvisorRequest(request, {
    name: 'Ray Dalio',
    supabaseId: 'ray-dalio',
    systemPrompt: DALIO_SYSTEM_PROMPT,
    knowledgeVersion: 'ray-dalio-v1',
  });
}
