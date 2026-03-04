import { NextRequest } from "next/server";
import { handleAdvisorRequest } from '@/lib/trading/advisor-api';
import { BUFFETT_SYSTEM_PROMPT } from '@/lib/warren-buffett-knowledge';

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  return handleAdvisorRequest(request, {
    name: 'Warren Buffett',
    systemPrompt: BUFFETT_SYSTEM_PROMPT,
    knowledgeVersion: 'warren-buffett-v1-portfolio-letters',
  });
}
