import { Logging } from '@google-cloud/logging';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'stockmaster-b1d3e';
const logging = new Logging({ projectId });
const logName = 'supplymind-intelligence-log';
const log = logging.log(logName);

export async function logEvent(severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL', message: string, metadata: any = {}) {
  const resource = { type: 'global' };
  const entry = log.entry(
    { resource, severity },
    {
      message,
      ...metadata,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  );

  try {
    await log.write(entry);
    console.log(`[Cloud Logging] ${severity}: ${message}`);
  } catch (error) {
    console.error('Cloud Logging Error:', error);
    // Fallback to console
    console.log(`[FALLBACK] ${severity}: ${message}`);
  }
}

export async function logRiskIntervention(shipmentId: string, riskScore: number, action: string) {
  return logEvent('INFO', `Risk Intervention: ${action}`, {
    shipmentId,
    riskScore,
    category: 'RISK_MITIGATION'
  });
}
