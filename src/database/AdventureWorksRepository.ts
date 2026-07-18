import { PrismaClient } from '@prisma/client';

export class AdventureWorksRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({});
  }

  public async getSellableProducts() {
    return this.prisma.product.findMany({
      where: {
        ProductModelID: {
          not: null
        },
        ProductProductPhoto: {
          some: {
            ProductPhoto: {
              NOT: [
                {
                  ThumbnailPhotoFileName: {
                    contains: 'no_image_available'
                  }
                },
                {
                  LargePhotoFileName: {
                    contains: 'no_image_available'
                  }
                }
              ]
            }
          }
        }
      },
      include: {
        ProductModel: true,
        ProductProductPhoto: {
          include: {
            ProductPhoto: true
          }
        }
      }
    });
  }

  // Helper function for raw counts needed in tests
  public async getTotalProductCount() {
    return this.prisma.product.count();
  }

  // Intermediate filter step count
  public async getProductsWithModelCount() {
    return this.prisma.product.count({
      where: {
        ProductModelID: {
          not: null
        }
      }
    });
  }
}
