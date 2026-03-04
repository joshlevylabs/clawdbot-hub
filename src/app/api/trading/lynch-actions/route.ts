import { NextRequest } from "next/server";
import { handleAdvisorRequest } from '@/lib/trading/advisor-api';
import { LYNCH_SYSTEM_PROMPT } from '@/lib/peter-lynch-knowledge';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handleAdvisorRequest(request, {
    name: 'Peter Lynch',
    supabaseId: 'peter-lynch',
    systemPrompt: LYNCH_SYSTEM_PROMPT,
    knowledgeVersion: 'peter-lynch-v1',
  });
}
