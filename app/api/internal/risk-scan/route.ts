import { NextRequest, NextResponse } from 'next/server';
import { runRiskScan } from '@/lib/services/riskEngine';

// POST route triggered by n8n orchestrator or cron
export async function POST(request: NextRequest) {
  try {
    // In production we verify an authorization header to match an n8n webhook secret
    const results = await runRiskScan();
    return NextResponse.json({ success: true, processed: results.length, data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
