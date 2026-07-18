import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const prisma = new PrismaClient();
const LOG_DIR = path.join(process.cwd(), 'logs');

// Utility to recursively trim strings (fixes the "U " whitespace timebomb)
function sanitizeData<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Buffer.isBuffer(obj) || obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeData) as any;

  const trimmedObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      trimmedObj[key] = value.trim();
    } else if (typeof value === 'object') {
      trimmedObj[key] = sanitizeData(value);
    } else {
      trimmedObj[key] = value;
    }
  }
  return trimmedObj as T;
}

async function main() {
  console.log('--- AdventureWorks Data Extraction & Audit ---');

  // Ensure logs directory exists
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }

  // =======================================================================
  // 1. AUDIT: Verify placeholder filename assumption
  // =======================================================================
  console.log('\n[1/5] Auditing distinct photo filenames...');
  const distinctPhotos = await prisma.$queryRaw<{ ThumbnailPhotoFileName: string }[]>`
    SELECT DISTINCT ThumbnailPhotoFileName 
    FROM Production.ProductPhoto 
    WHERE ThumbnailPhotoFileName NOT LIKE '%no_image_available%'
    ORDER BY ThumbnailPhotoFileName;
  `;
  
  fs.writeFileSync(
    path.join(LOG_DIR, 'audit_distinct_photos.json'), 
    JSON.stringify(distinctPhotos, null, 2)
  );
  console.log(`      Found ${distinctPhotos.length} unique legitimate filenames. (Check logs/audit_distinct_photos.json for unexpected placeholders)`);

  // =======================================================================
  // 2. EXCLUSIONS: Isolate "No Model" (Manufacturing Parts)
  // =======================================================================
  console.log('[2/5] Identifying products with no ProductModel...');
  const noModelExclusions = await prisma.product.findMany({
    where: { ProductModelID: null },
    select: { ProductID: true, ProductNumber: true, Name: true }
  });

  fs.writeFileSync(
    path.join(LOG_DIR, 'exclusions_no_model.json'),
    JSON.stringify(noModelExclusions, null, 2)
  );
  console.log(`      Excluded: ${noModelExclusions.length} items.`);

  // =======================================================================
  // 3. EXCLUSIONS: Isolate "Placeholder Only" 
  // =======================================================================
  console.log('[3/5] Identifying products with models but only placeholder images...');
  
  // A product is excluded here if it lacks ANY photo that is a real image.
  // Using 'none' ensures we catch items where every single associated photo is a placeholder.
  const placeholderExclusions = await prisma.product.findMany({
    where: {
      ProductModelID: { not: null },
      ProductProductPhoto: {
        none: {
          ProductPhoto: {
            NOT: [
              { ThumbnailPhotoFileName: { contains: 'no_image_available' } },
              { LargePhotoFileName: { contains: 'no_image_available' } }
            ]
          }
        }
      }
    },
    select: { ProductID: true, ProductNumber: true, Name: true }
  });

  fs.writeFileSync(
    path.join(LOG_DIR, 'exclusions_placeholder_only.json'),
    JSON.stringify(placeholderExclusions, null, 2)
  );
  console.log(`      Excluded: ${placeholderExclusions.length} items.`);

  // =======================================================================
  // 4. SUCCESS: Extract Sellable Products
  // =======================================================================
  console.log('[4/5] Extracting clean, sellable products...');
  const rawSellableProducts = await prisma.product.findMany({
    where: {
      ProductModelID: { not: null },
      ProductProductPhoto: {
        some: {
          ProductPhoto: {
            NOT: [
              { ThumbnailPhotoFileName: { contains: 'no_image_available' } },
              { LargePhotoFileName: { contains: 'no_image_available' } }
            ]
          }
        }
      }
    },
    include: {
      ProductModel: true,
      ProductProductPhoto: {
        include: { ProductPhoto: true }
      }
    }
  });
  
  // =======================================================================
  // 5. SANITIZE: Address the Whitespace Timebomb
  // =======================================================================
  console.log('[5/5] Sanitizing data (trimming NCHAR/CHAR whitespace padding)...');
  const sanitizedProducts = sanitizeData(rawSellableProducts);

  fs.writeFileSync(
    path.join(LOG_DIR, 'success_sellable_products.json'),
    // We truncate buffer serialization for the JSON log so it doesn't freeze your IDE
    JSON.stringify(sanitizedProducts, (key, value) => {
      if (value && value.type === 'Buffer') return '<Buffer truncated>';
      return value;
    }, 2)
  );

  // =======================================================================
  // FINAL REPORT
  // =======================================================================
  const totalInDB = noModelExclusions.length + placeholderExclusions.length + sanitizedProducts.length;
  
  console.log('\n--- FINAL TALLY ---');
  console.log(`Total Products in DB:       ${totalInDB}`);
  console.log(`Excluded (No Model):       -${noModelExclusions.length}`);
  console.log(`Excluded (Placeholder):    -${placeholderExclusions.length}`);
  console.log(`--------------------------------`);
  console.log(`Clean, Sellable Products:   ${sanitizedProducts.length}`);
  console.log('\nAll outputs written to the /logs directory for auditing.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
