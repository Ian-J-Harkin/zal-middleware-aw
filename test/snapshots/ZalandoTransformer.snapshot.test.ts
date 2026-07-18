import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { ZalandoTransformer } from '../../src/transmission/ZalandoTransformer';

describe('ZalandoTransformer - Point-in-Time Snapshot Suite', () => {
  // Load the physical extraction file generated in Epic 3
  const fixturePath = path.join(process.cwd(), 'logs', 'success_sellable_products.json');
  let rawProducts: any[] = [];

  try {
    rawProducts = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  } catch (e) {
    console.error(`Failed to load snapshot fixture at ${fixturePath}. Run Epic 3 extraction first.`);
    process.exit(1);
  }

  it('should process the exact 157 legacy rows extracted from AdventureWorks2022', () => {
    assert.strictEqual(rawProducts.length, 157, 'Snapshot fixture must contain exactly 157 records.');
  });

  it('should group the flat rows into the correct number of distinct Models', () => {
    const transformer = new ZalandoTransformer();
    const payload = transformer.transformProducts(rawProducts);

    // Calculate the distinct grouping key count manually from the fixture
    const uniqueModelIds = new Set(rawProducts.map(p => p.ProductModelID));
    
    // The engine must group the 157 flat rows into exactly this many hierarchical Models
    assert.strictEqual(payload.length, uniqueModelIds.size);
    
    console.log(`\n    [Snapshot Info] Successfully grouped 157 flat rows into ${uniqueModelIds.size} Zalando Models.`);
  });

  it('should accurately map specific known product: 713 (Long-Sleeve Logo Jersey, S, Multi)', () => {
    const transformer = new ZalandoTransformer();
    const payload = transformer.transformProducts(rawProducts);

    // Assert the Model exists (ProductModelID: 11)
    const jerseyModel = payload.find(p => p.model.model_sku === 'MODEL-11');
    assert.ok(jerseyModel, 'MODEL-11 was not generated.');

    // Assert the Config exists and Color mapped correctly (Color: Multi -> ZALANDO_COLOR_CODES '006')
    const multiConfig = jerseyModel.model.configs.find((c: any) => c.config_sku === 'CONFIG-11-Multi');
    assert.ok(multiConfig, 'CONFIG-11-Multi was not generated.');
    assert.strictEqual(multiConfig.color_code, '006', 'Color "Multi" did not map to "006".');

    // Assert the Simple exists (Size: S)
    const smallSimple = multiConfig.simples.find((s: any) => s.simple_sku === 'LJ-0192-S');
    assert.ok(smallSimple, 'Simple LJ-0192-S was not generated.');
    assert.strictEqual(smallSimple.size_code, 'S', 'Size code did not map correctly.');
  });
  
  it('should format MinIO media URLs correctly for known product 713', () => {
    const transformer = new ZalandoTransformer();
    const payload = transformer.transformProducts(rawProducts);
    
    const jerseyModel = payload.find(p => p.model.model_sku === 'MODEL-11');
    const multiConfig = jerseyModel.model.configs.find((c: any) => c.config_sku === 'CONFIG-11-Multi');
    const primaryMedia = multiConfig.media[0];

    // Verify the URL structure using the actual filename from the DB payload
    assert.strictEqual(primaryMedia.url, 'https://minio.local/bucket/awc_jersey_male_small.gif');
    assert.strictEqual(primaryMedia.media_sort_key, 1);
  });
});
