import { NextRequest } from "next/server";
import { handleAdvisorRequest } from '@/lib/trading/advisor-api';
import { SCHIFF_SYSTEM_PROMPT } from '@/lib/peter-schiff-knowledge';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handleAdvisorRequest(request, {
    name: 'Peter Schiff',
    supabaseId: 'peter-schiff',
    systemPrompt: SCHIFF_SYSTEM_PROMPT,
    knowledgeVersion: 'peter-schiff-v1',
  });
}
