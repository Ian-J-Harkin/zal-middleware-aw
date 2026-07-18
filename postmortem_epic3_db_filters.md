# Epic 3 Postmortem: Database Filter Implementation & Correction

This document serves as a postmortem for the data extraction layer implemented during Epic 3. It details the initial logic error in our Prisma queries, the verification steps that exposed the bug, and the final resolution.

## 1. Background & Requirements
The goal of Epic 3 was to extract products from the AdventureWorks2022 database to send to the Zalando API. Two strict business rules were defined for the extraction:
1. **Model Requirement:** Exclude any products that do not belong to a Product Model (i.e., `ProductModelID IS NOT NULL`). This filters out internal manufacturing components.
2. **Image Requirement:** Exclude any products that only possess placeholder images (`no_image_available.gif`).

## 2. The Initial Flawed Implementation
Initially, the data extraction layer (`AdventureWorksRepository.ts`) attempted to satisfy both constraints in a single Prisma query:

```typescript
public async getSellableProducts() {
  return this.prisma.product.findMany({
    where: { 
      ProductModelID: { not: null } 
    },
    include: {
      ProductModel: true,
      ProductProductPhoto: {
        include: { ProductPhoto: true },
        where: {
          ProductPhoto: {
            NOT: [
              { ThumbnailPhotoFileName: { contains: 'no_image_available' } },
              { LargePhotoFileName: { contains: 'no_image_available' } }
            ]
          }
        }
      }
    }
  });
}
```

> [!WARNING]
> **The Logic Bug:** 
> In Prisma, applying a `where` clause inside an `include` block filters the **child relations returned**, but does **not** filter the parent record. 
> 
> As a result, this query successfully fetched all 295 products with a `ProductModelID`, but for the 138 products that possessed only placeholder images, they were returned with an empty `ProductProductPhoto: []` array. If unchecked, we would have transmitted 138 image-less products to the Zalando API.

## 3. The Verification Request
The master architect requested a discrete count of products at each stage of the filtering process to ensure the photo-placeholder filter wasn't over-excluding products. To answer this, a dedicated query was added to the repository:

```typescript
// Added to track intermediate filtering stage
public async getProductsWithModelCount() {
  return this.prisma.product.count({
    where: {
      ProductModelID: { not: null }
    }
  });
}
```

## 4. The Resolution
Writing the intermediate count query illuminated the logic flaw in the main extraction query. To ensure the database engine drops the parent `Product` row entirely when it lacks a valid photo, the photo constraint was moved to the root `where` clause using Prisma's relational `some` operator:

```typescript
public async getSellableProducts() {
  return this.prisma.product.findMany({
    where: {
      ProductModelID: { not: null },
      // FIX: The database will now strictly enforce that the parent product 
      // possesses at least one photo not matching the placeholder strings.
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
}
```

## 5. Final Verified Outputs
Running the verification script (`npx tsx src/scripts/test-db.ts`) with the corrected queries yielded the following exact counts:

```console
Testing AdventureWorks Data Extraction...
Total Products: 504
Products with Models: 295
Products with Models AND Real Images: 157
```

### Cascading Filter Breakdown:
* **Stage 1 (Raw Table):** 504 total items in the `Product` table.
* **Stage 2 (Model Filter):** 209 internal manufacturing components were dropped, leaving 295 products.
* **Stage 3 (Photo Filter):** 138 products were found to only possess `no_image_available.gif` photos and were successfully dropped, leaving a final payload of **157 sellable products**.

### Sample Payload
A JSON serialization of one of the 157 validated records, confirming the relational joins succeeded and real image files are present:

```json
{
  "ProductID": 713,
  "Name": "Long-Sleeve Logo Jersey, S",
  "ProductNumber": "LJ-0192-S",
  "MakeFlag": false,
  "FinishedGoodsFlag": true,
  "Color": "Multi",
  "SafetyStockLevel": 4,
  "ReorderPoint": 3,
  "StandardCost": 38.4923,
  "ListPrice": 49.99,
  "Size": "S",
  "SizeUnitMeasureCode": null,
  "WeightUnitMeasureCode": null,
  "Weight": null,
  "DaysToManufacture": 0,
  "ProductLine": "S ",
  "Class": null,
  "Style": "U ",
  "ProductSubcategoryID": 21,
  "ProductModelID": 11,
  "SellStartDate": "2011-05-31T00:00:00.000Z",
  "SellEndDate": null,
  "DiscontinuedDate": null,
  "rowguid": "fd449c82-a259-4fae-8584-6ca0255faf68",
  "ModifiedDate": "2014-02-08T10:01:36.826Z",
  "ProductModel": {
    "ProductModelID": 11,
    "Name": "Long-Sleeve Logo Jersey",
    "CatalogDescription": null,
    "Instructions": null,
    "rowguid": "20efe3f1-a2f8-4dde-b74b-18265f61f863",
    "ModifiedDate": "2011-05-01T00:00:00.000Z"
  },
  "ProductProductPhoto": [
    {
      "ProductID": 713,
      "ProductPhotoID": 162,
      "Primary": true,
      "ModifiedDate": "2011-05-01T00:00:00.000Z",
      "ProductPhoto": {
        "ProductPhotoID": 162,
        "ThumbNailPhoto": "<Buffer truncated>",
        "ThumbnailPhotoFileName": "awc_jersey_male_small.gif",
        "LargePhoto": "<Buffer truncated>",
        "LargePhotoFileName": "awc_jersey_male_large.gif",
        "ModifiedDate": "2011-05-01T00:00:00.000Z"
      }
    }
  ]
}
```

## 6. Structural Gaps & Robustness Improvements
Following a critical review of the initial successful extraction, several structural gaps were identified and closed to ensure the pipeline adheres strictly to our Epic 1 data discipline:

### A. The "Mislabeled Metric" Correction
Our original reporting grouped intermediate steps under the final count, which masked the exact impact of the photo filter. By explicitly breaking down the logging across the three distinct constraints (Total -> Model Exclusions -> Photo Exclusions), we eliminated false confidence and secured an accurate view of the data payload.

### B. The Placeholder Assumption Audit
To confirm `no_image_available.gif` was indeed the *only* generic placeholder in the 20-year-old database, a distinct filename audit was run against the remaining valid entries. The script verified exactly 100 unique, legitimate descriptor filenames (e.g., `awc_jersey_female_small.gif`), proving no hidden placeholders like `default.jpg` or `coming_soon.gif` slipped through the net.

### C. The Whitespace Timebomb (NCHAR Sanitization)
AdventureWorks utilizes fixed-length `NCHAR`/`CHAR` columns, padding values with trailing spaces (e.g., `"Style": "U "`). To prevent these artifacts from silently breaking string-mapping routines in Epic 4 (e.g., `'U ' !== 'U'`), a recursive `sanitizeData` utility was integrated to aggressively trim all string properties before final export.

### D. Reinstating the Three-Tier Audit Trail
The most critical structural gap was dropping 347 non-compliant rows into the void without logging *why* they failed. The verification script was updated to actively query and persist the exact excluded items to disk, recreating the three-tier discipline established in Epic 1:
- `logs/exclusions_no_model.json` (209 items discarded as manufacturing parts)
- `logs/exclusions_placeholder_only.json` (138 items discarded for lacking valid photos)
- `logs/success_sellable_products.json` (157 pristine, sanitized products)

These logs ensure zero products are dropped silently, preserving a full physical audit trail for future review.
