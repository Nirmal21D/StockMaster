import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

console.log('Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('Has Private Key:', !!process.env.FIREBASE_PRIVATE_KEY);
