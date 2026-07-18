import * as Minio from 'minio';

export class MinioService {
  private client: Minio.Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.MINIO_BUCKET || 'bucket';
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
    });
  }

  /**
   * Ensure the target bucket exists, creating it if necessary.
   */
  public async ensureBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        console.log(`[MinioService] Created bucket: ${this.bucketName}`);
      }
    } catch (error) {
      console.error(`[MinioService] Failed to ensure bucket ${this.bucketName}:`, error);
      throw error;
    }
  }

  /**
   * Upload a physical buffer to the MinIO bucket.
   */
  public async uploadPhoto(fileName: string, buffer: Buffer): Promise<void> {
    try {
      await this.client.putObject(this.bucketName, fileName, buffer);
    } catch (error) {
      console.error(`[MinioService] Failed to upload ${fileName}:`, error);
      throw error;
    }
  }
}
