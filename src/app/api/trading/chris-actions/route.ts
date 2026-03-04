import { NextRequest } from "next/server";
import { handleAdvisorRequest } from '@/lib/trading/advisor-api';
import { CHRIS_SYSTEM_PROMPT } from '@/lib/chris-vermeulen-knowledge';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handleAdvisorRequest(request, {
    name: 'Chris Vermeulen',
    supabaseId: 'chris-vermeulen',
    systemPrompt: CHRIS_SYSTEM_PROMPT,
    knowledgeVersion: 'chris-vermeulen-v2-10videos',
  });
}
