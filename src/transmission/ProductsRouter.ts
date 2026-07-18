import { Router, Request, Response } from 'express';
import { AdventureWorksRepository } from '../database/AdventureWorksRepository';
import { ZalandoTransformer } from './ZalandoTransformer';
import { MinioService } from '../services/MinioService';

const router = Router();
const repository = new AdventureWorksRepository();
const transformer = new ZalandoTransformer();
const minioService = new MinioService();

// Initialize bucket on startup
minioService.ensureBucket().catch(console.error);

router.get('/export', async (req: Request, res: Response) => {
  try {
    // 1. Extract clean, sanitized rows from SQL Server
    const rawProducts = await repository.getSellableProducts();

    // 1.5. Orchestrate the MinIO Upload (Rule 3)
    const uploadedFiles = new Set<string>();
    
    for (const product of rawProducts) {
      if (product.ProductProductPhoto && Array.isArray(product.ProductProductPhoto)) {
        for (const relation of product.ProductProductPhoto) {
          const photo = relation.ProductPhoto;
          if (!photo) continue;
          
          if (photo.ThumbnailPhotoFileName && photo.ThumbNailPhoto && !uploadedFiles.has(photo.ThumbnailPhotoFileName)) {
            await minioService.uploadPhoto(photo.ThumbnailPhotoFileName, photo.ThumbNailPhoto);
            uploadedFiles.add(photo.ThumbnailPhotoFileName);
          }
          
          if (photo.LargePhotoFileName && photo.LargePhoto && !uploadedFiles.has(photo.LargePhotoFileName)) {
            await minioService.uploadPhoto(photo.LargePhotoFileName, photo.LargePhoto);
            uploadedFiles.add(photo.LargePhotoFileName);
          }
        }
      }
    }

    console.log(`[ProductsRouter] Uploaded ${uploadedFiles.size} unique media files to MinIO.`);

    // 2. Map and group into the Zally-validated ArticlePayload schema
    const payload = transformer.transformProducts(rawProducts);

    // 3. Transmit the standard JSON payload
    res.status(200).json({
      meta: {
        total_models: payload.length,
        source_rows: rawProducts.length,
        media_uploaded: uploadedFiles.size
      },
      data: payload
    });
  } catch (error) {
    console.error('[ProductsRouter] Export failed:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'Unknown error during extraction' 
    });
  }
});

export const productsRouter = router;
