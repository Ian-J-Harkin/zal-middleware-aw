import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ZalandoTransformer } from '../../src/transmission/ZalandoTransformer';

describe('ZalandoTransformer - General Volume-Agnostic Suite', () => {
  
  const createSyntheticPrismaProduct = (overrides = {}) => ({
    ProductID: 1000,
    Name: 'Synthetic Test Product',
    ProductNumber: 'STP-001',
    Color: 'Black',
    Size: 'M',
    ProductModelID: 50,
    ProductModel: {
      ProductModelID: 50,
      Name: 'Synthetic Model'
    },
    ProductProductPhoto: [
      {
        Primary: true,
        ProductPhoto: {
          ThumbnailPhotoFileName: 'synthetic_thumb.gif',
          ThumbNailPhoto: Buffer.from('fake-image-data')
        }
      }
    ],
    ...overrides
  });

  describe('Core Hierarchy Grouping (Model -> Config -> Simple)', () => {
    it('should group multiple flat rows into a single Model with nested Configs and Simples', () => {
      const transformer = new ZalandoTransformer();
      
      // Input: Two sizes of the same color, sharing a ProductModelID
      const input = [
        createSyntheticPrismaProduct({ ProductID: 1, ProductNumber: 'STP-001-M', Size: 'M' }),
        createSyntheticPrismaProduct({ ProductID: 2, ProductNumber: 'STP-001-L', Size: 'L' })
      ];

      const result = transformer.transformProducts(input);

      // Assert 2 flat inputs become 1 hierarchical output
      assert.strictEqual(result.length, 1);
      
      const articleModel = result[0];
      assert.strictEqual(articleModel.model_sku, 'MODEL-50');
      
      // Assert 1 color variant = 1 Config
      assert.strictEqual(articleModel.configs.length, 1);
      assert.strictEqual(articleModel.configs[0].config_sku, 'CONFIG-50-Black');
      
      // Assert 2 sizes = 2 Simples nested under that Config
      assert.strictEqual(articleModel.configs[0].simples.length, 2);
      assert.strictEqual(articleModel.configs[0].simples[0].simple_sku, 'STP-001-M');
      assert.strictEqual(articleModel.configs[0].simples[0].size_code, 'M');
      assert.strictEqual(articleModel.configs[0].simples[1].simple_sku, 'STP-001-L');
      assert.strictEqual(articleModel.configs[0].simples[1].size_code, 'L');
    });
  });

  describe('Color Code Dictionary Mapping', () => {
    it('should translate AdventureWorks colors into Zalando color codes', () => {
      const transformer = new ZalandoTransformer();
      const input = [createSyntheticPrismaProduct({ Color: 'Black' })];
      const result = transformer.transformProducts(input);
      
      // Assuming 'Black' maps to '001' in our dictionary
      assert.strictEqual(result[0].configs[0].color_code, '001');
    });
  });

  describe('Media Object Schema (MinIO Architecture)', () => {
    it('should format media objects with MinIO URLs, not embedded Base64 data', () => {
      const transformer = new ZalandoTransformer();
      const input = [createSyntheticPrismaProduct()];
      const result = transformer.transformProducts(input);
      
      const mediaObj = result[0].configs[0].media[0];
      
      assert.strictEqual(mediaObj.url, 'https://minio.local/bucket/synthetic_thumb.gif');
      assert.strictEqual(mediaObj.media_sort_key, 1);
      assert.strictEqual(mediaObj.media_category, 'IMAGE');
      assert.strictEqual((mediaObj as any).base64_data, undefined); // Strictly enforce no base64
    });
  });
  describe('Large Photo Media Handling', () => {
    it('should extract both Thumbnail and Large photos with sequential sort keys', () => {
      const transformer = new ZalandoTransformer();
      const input = [
        createSyntheticPrismaProduct({
          ProductProductPhoto: [{
            Primary: true,
            ProductPhoto: {
              ThumbnailPhotoFileName: 'synthetic_thumb.gif',
              LargePhotoFileName: 'synthetic_large.gif'
            }
          }]
        })
      ];
      const result = transformer.transformProducts(input);
      
      const mediaArray = result[0].configs[0].media;
      
      assert.strictEqual(mediaArray.length, 2);
      assert.strictEqual(mediaArray[0].url, 'https://minio.local/bucket/synthetic_thumb.gif');
      assert.strictEqual(mediaArray[0].media_sort_key, 1);
      assert.strictEqual(mediaArray[1].url, 'https://minio.local/bucket/synthetic_large.gif');
      assert.strictEqual(mediaArray[1].media_sort_key, 2);
    });
  });

  describe('Volume Resilience (Rule 5)', () => {
    it('should process 5,000 synthetic records efficiently without dropping data', () => {
      const transformer = new ZalandoTransformer();
      
      const massiveInput = Array.from({ length: 5000 }, (_, i) => {
        const modelId = Math.floor(i / 5); 
        return createSyntheticPrismaProduct({ 
          ProductID: i, 
          ProductNumber: `STP-${i}`,
          ProductModelID: modelId,
          Size: `SIZE-${i % 5}`
        });
      });
      
      const result = transformer.transformProducts(massiveInput);

      assert.strictEqual(result.length, 1000);
      assert.strictEqual(result[999].model_sku, 'MODEL-999');
      assert.strictEqual(result[999].configs[0].simples.length, 5);
    });
  });

  describe('Strict OpenAPI Schema Compliance (Epic 5 Regression Prevention)', () => {
    it('should explicitly include all required schema fields (brand_code, silhouette_id, etc.) without wrapper', () => {
      const transformer = new ZalandoTransformer();
      const input = [createSyntheticPrismaProduct()];
      const result = transformer.transformProducts(input);
      
      const articleModel = result[0];
      
      // Ensure the model wrapper is gone
      assert.strictEqual((articleModel as any).model, undefined, 'Payload must be flat, no nested model wrapper allowed');
      
      // Assert required Model fields
      assert.ok(articleModel.model_sku, 'Missing model_sku');
      assert.strictEqual(articleModel.brand_code, 'AW-123', 'Missing required brand_code');
      assert.strictEqual(articleModel.silhouette_id, 'clothing', 'Missing required silhouette_id');
      assert.ok(Array.isArray(articleModel.configs), 'Missing configs array');
      
      // Assert required Config fields
      const config = articleModel.configs[0];
      assert.ok(config.config_sku, 'Missing config_sku');
      assert.ok(config.color_code, 'Missing color_code');
      assert.ok(config.supplier_color, 'Missing supplier_color');
      assert.ok(Array.isArray(config.simples), 'Missing simples array');
      
      // Assert required Simple fields
      const simple = config.simples[0];
      assert.ok(simple.simple_sku, 'Missing simple_sku');
      assert.strictEqual(simple.size_grid_id, 'US', 'Missing required size_grid_id');
      assert.ok(simple.size_code, 'Missing size_code');
    });
  });
});
