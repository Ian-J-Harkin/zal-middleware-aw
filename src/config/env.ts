import * as dotenv from 'dotenv';

dotenv.config();

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`CRITICAL STARTUP ERROR: Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PRISM_URL: getRequiredEnvVar('PRISM_URL'),
  CLIENT_ID: getRequiredEnvVar('CLIENT_ID'),
  CLIENT_SECRET: getRequiredEnvVar('CLIENT_SECRET')
};
