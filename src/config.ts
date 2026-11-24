import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { Pool } from 'pg';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing from .env');
}

const keyPath = process.env.FIREBASE_KEY_PATH;
if (!keyPath) {
  throw new Error('FIREBASE_KEY_PATH is missing from .env');
}

const serviceAccount = JSON.parse(readFileSync(path.resolve(keyPath), 'utf8'));
if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount) });
}

export const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
export const firestore = getFirestore();
export { FieldValue };
