export class ZalandoTransformer {
  // Epic 1 Color Dictionary mapped to standard Zalando hex/codes
  private readonly ZALANDO_COLOR_CODES: Record<string, string> = {
    'Black': '001',
    'Silver': '002',
    'Red': '003',
    'Yellow': '004',
    'Blue': '005',
    'Multi': '006'
  };

  public transformProducts(products: any[]): any[] {
    if (!Array.isArray(products)) return [];

    // Map structure: ModelID -> Map<Color, ConfigData>
    const modelsMap = new Map<number, any>();

    for (const product of products) {
      if (product.ProductModelID == null) continue; // Safety check per Rule 2 (Singleton handling logic can be expanded here)

      const modelId = product.ProductModelID;
      const color = product.Color || 'UNKNOWN';

      // 1. Initialize Model if it doesn't exist
      if (!modelsMap.has(modelId)) {
        modelsMap.set(modelId, {
          model_sku: `MODEL-${modelId}`,
          configsMap: new Map<string, any>()
        });
      }

      const currentModel = modelsMap.get(modelId);

      // 2. Initialize Config if it doesn't exist for this Color
      if (!currentModel.configsMap.has(color)) {
        currentModel.configsMap.set(color, {
          config_sku: `CONFIG-${modelId}-${color}`,
          color_code: this.ZALANDO_COLOR_CODES[color] || '999', // Fallback code
          supplier_color: color,
          media: this.transformMedia(product.ProductProductPhoto),
          simples: []
        });
      }

      const currentConfig = currentModel.configsMap.get(color);

      // 3. Push the specific Size variant as a Simple
      currentConfig.simples.push({
        simple_sku: product.ProductNumber,
        size_grid_id: "US",
        size_code: product.Size || 'OS' // Fallback for Onesize
      });
    }

    // 4. Serialize Maps back into the nested Array structure required by openapi.yaml
    const payload = [];
    for (const [_, modelData] of modelsMap) {
      const configs = [];
      for (const [__, configData] of modelData.configsMap) {
        configs.push(configData);
      }
      payload.push({
        model_sku: modelData.model_sku,
        brand_code: "AW-123",
        silhouette_id: "clothing",
        configs: configs
      });
    }

    return payload;
  }

  private transformMedia(photoRelations: any[]) {
    if (!photoRelations || !Array.isArray(photoRelations)) return [];

    const mediaObjects = [];
    let sortKey = 1;

    for (const relation of photoRelations) {
      const photo = relation.ProductPhoto;
      if (!photo) continue;

      // Process Thumbnail
      if (photo.ThumbnailPhotoFileName) {
        mediaObjects.push({
          url: `https://minio.local/bucket/${photo.ThumbnailPhotoFileName}`,
          media_sort_key: sortKey++,
          media_category: 'IMAGE' 
        });
      }

      // Process Large Photo
      if (photo.LargePhotoFileName) {
        mediaObjects.push({
          url: `https://minio.local/bucket/${photo.LargePhotoFileName}`,
          media_sort_key: sortKey++,
          media_category: 'IMAGE'
        });
      }
    }

    return mediaObjects;
  }
}
