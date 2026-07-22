# Change Report: `135a836` → `32387e2`

**Date:** July 22, 2026  
**Commits:** 10  
**Files changed:** 11  
**Lines:** +140 / -87

---

## Commit History

| Commit | Message |
|--------|---------|
| `32387e2` | fix: improve URL extraction logic for KYC document handling |
| `e5750f2` | fix: enhance signed URL generation to include content disposition and type options |
| `e64f6b1` | fix: add mock GST details retrieval for testing purposes |
| `0bf1064` | fix: correct access token retrieval and improve error handling in GST verification |
| `7c1c94d` | fix: update upload asset functionality to include category handling and size validation |
| `fd7add7` | fix: add logging for failed deletion of old shop media from storage |
| `5afab0e` | fix: handle old logo and banner keys during shop update to ensure proper deletion from storage |
| `87e8007` | fix: update upload asset key format to use 'shop-assets' instead of 'customer-uploads' |
| `c56f3f5` | fix: remove non-existent DB model dependency from upload-asset, upload directly to storage |
| `6042561` | fix: update upload asset route to remove versioning |

---

## Detailed Changes by Module

### 1. Upload Asset Module — Major Refactor

**Files affected:**
- `src/modules/upload-asset/upload-asset.service.ts`
- `src/modules/upload-asset/upload-asset.controller.ts`
- `src/modules/upload-asset/upload-asset.routes.ts`
- `src/modules/upload-asset/upload-asset.schema.ts` (deleted)

**What changed:**

- **Removed DB dependency:** Uploads no longer create `customerUploadAsset` database records. The service now returns the upload result (URL, key, fileType) directly without persisting to the database.
- **Added category support:** New `category` parameter (`shop-assets` or `kyc-documents`) with per-category file size limits:
  - `shop-assets`: 10MB max
  - `kyc-documents`: 5MB max
  - Default fallback: 10MB
- **Changed key format:** Upload keys changed from `customer-uploads/{userId}/{timestamp}-{uuid}{ext}` to `{category}/{userId}/{timestamp}-{uuid}{ext}`.
- **Removed endpoints:**
  - `GET /` (listRecent) — removed
  - `DELETE /:assetId` (deleteAsset) — removed
  - Associated schema validation (`listRecentSchema`, `assetParamSchema`) removed
- **Deleted file:** `upload-asset.schema.ts` entirely removed.
- **Simplified routes:** Only `POST /` remains with `protect` + `uploadLimiter` middleware.

**Before:**
```typescript
const safeKey = `customer-uploads/${userId}/${Date.now()}-${randomUUID()}${ext}`;
// ...
return db.customerUploadAsset.create({
  data: { userId, url: upload.url, key: upload.key, fileType: file.mimetype },
});
```

**After:**
```typescript
const safeKey = `${category}/${userId}/${Date.now()}-${randomUUID()}${ext}`;
// ...
return {
  id: randomUUID(),
  url: upload.url,
  key: upload.key,
  fileType: file.mimetype,
};
```

---

### 2. Shop Service — Old Media Cleanup

**File affected:** `src/modules/shop/shop.service.ts`

**What changed:**

- **Old media tracking:** During shop updates, the service now tracks the previous `logoKey` and `bannerKey` values before updating.
- **Storage cleanup:** When a shop's logo or banner is replaced, the old file is deleted from storage (S3/Railway bucket) to prevent orphaned files.
- **Error logging:** Failed deletions of old media are logged as warnings instead of throwing errors, ensuring shop updates don't fail due to storage cleanup issues.
- **Added import:** `logger` from `../../utils/logger`.

**New code:**
```typescript
const oldLogoKey =
  data.logoKey && data.logoKey !== shop.logoKey ? shop.logoKey : null;
const oldBannerKey =
  data.bannerKey && data.bannerKey !== shop.bannerKey ? shop.bannerKey : null;

// After update...
if (oldLogoKey || oldBannerKey) {
  const storage = StorageFactory.get();
  await Promise.all(
    [oldLogoKey, oldBannerKey]
      .filter((key): key is string => !!key)
      .map((key) =>
        storage.delete({ key }).catch((err) => {
          logger.warn(
            { err: err?.message, key, shopId },
            "Failed to delete old shop media from storage",
          );
          return null;
        }),
      ),
  );
}
```

---

### 3. Seller Service — KYC Document URL Signing

**File affected:** `src/modules/seller/seller.service.ts`

**What changed:**

- **Added `extractStorageKey()` function:** Extracts the storage key from a full URL. If the value is not a URL (already a key), it returns it as-is.
- **Added `resolveKycDocumentUrls()` function:** Generates signed URLs for all KYC documents associated with a seller. Uses 1-hour expiry and `inline` content disposition for in-browser viewing.
- **Modified `getSellerById()`:** Now returns signed KYC document URLs instead of raw storage keys. This allows the frontend to display KYC documents directly without needing a separate signing endpoint.
- **Added import:** `StorageFactory` from `../../lib/storage/storage.factory`.
- **Minor fix:** Whitespace correction in `listAllSellers` query formatting.

**New functions:**
```typescript
function extractStorageKey(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\//, ""));
  } catch {
    return value;
  }
}

async function resolveKycDocumentUrls(kyc: { documents: string[] } | null) {
  if (!kyc || !kyc.documents?.length) return kyc;
  const storage = StorageFactory.get();
  const signedDocuments = await Promise.all(
    kyc.documents.map((doc) =>
      storage.getSignedUrl({
        key: extractStorageKey(doc),
        expiresIn: 3600,
        responseContentDisposition: "inline",
      }),
    ),
  );
  return { ...kyc, documents: signedDocuments };
}
```

**Modified `getSellerById`:**
```typescript
// Before
async getSellerById(sellerId: string) {
  return db.seller.findUnique({ where: { id: sellerId }, select: { ... } });
}

// After
async getSellerById(sellerId: string) {
  const seller = await db.seller.findUnique({ where: { id: sellerId }, select: { ... } });
  if (!seller) return null;
  return { ...seller, kyc: await resolveKycDocumentUrls(seller.kyc) };
}
```

---

### 4. GST Service — Mock Mode + Better Error Handling

**Files affected:**
- `src/modules/gst/gst.service.ts`
- `src/lib/gst/sandbox.provider.ts`

**What changed in `gst.service.ts`:**

- **Added `GST_MOCK=true` environment variable support:** When enabled, the service returns mock GST details without calling any external API. Useful for development and testing.
- **Added `getMockGstDetails()` function:** Returns hardcoded but realistic GST data for any valid GSTIN format.
- **Added import:** `GstDetails` type from `../../lib/gst/gst.interface`.

**New code:**
```typescript
function getMockGstDetails(gstin: string): GstDetails {
  return {
    gstin,
    legalName: "Test Business Pvt Ltd",
    tradeName: "Test Business",
    status: "Active",
    address: "123 Test Street, Test City, Test State 000000",
    registrationDate: "01/01/2020",
    businessType: "Private Limited Company",
    raw: { mock: true },
  };
}

// In verifyGst:
if (process.env.GST_MOCK === "true") {
  return getMockGstDetails(gstin);
}
```

**What changed in `sandbox.provider.ts`:**

- **Improved error handling:** On failed API response, the service now logs the status code and response body before throwing.
- **Fixed nested response parsing:** Handles both `payload.data.data` and `payload.data` response formats from the GST API.
- **Added response validation:** Checks that `result.gstin` exists before returning, throwing a clear error if the response is malformed.

**Before:**
```typescript
if (!res.ok)
  throw new Error("GST verification failed — invalid GSTIN or service error");

const data = (await res.json()) as any;
const result = data.data;
```

**After:**
```typescript
if (!res.ok) {
  const errBody = await res.text().catch(() => "");
  console.error("Sandbox GST search failed", res.status, errBody);
  throw new Error("GST verification failed — invalid GSTIN or service error");
}

const payload = (await res.json()) as any;
const result = payload.data?.data ?? payload.data;

if (!result || !result.gstin) {
  throw new Error("GST verification failed — invalid GSTIN or service error");
}
```

---

### 5. Storage Interface — Signed URL Options

**Files affected:**
- `src/lib/storage/storage.interface.ts`
- `src/lib/storage/s3.provider.ts`

**What changed:**

- **Added optional `responseContentDisposition` field** to `SignedUrlInput` interface — allows specifying `inline` or `attachment` disposition for signed URLs.
- **Added optional `responseContentType` field** to `SignedUrlInput` interface — allows specifying the content type for signed URLs.
- **Updated `S3Provider.getSignedUrl()`** to pass these options to the AWS SDK's `GetSignedUrlCommand` when provided.

**Interface change:**
```typescript
// Before
interface SignedUrlInput {
  key: string;
  expiresIn?: number;
}

// After
interface SignedUrlInput {
  key: string;
  expiresIn?: number;
  responseContentDisposition?: string;
  responseContentType?: string;
}
```

**S3 Provider change:**
```typescript
// Before
async getSignedUrl(input: SignedUrlInput): Promise<string> {
  const command = new GetObjectCommand({ Bucket: this.bucket, Key: input.key });
  return getSignedUrl(this.client, command, { expiresIn: input.expiresIn ?? 3600 });
}

// After
async getSignedUrl(input: SignedUrlInput): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: this.bucket,
    Key: input.key,
    ResponseContentDisposition: input.responseContentDisposition,
    ResponseContentType: input.responseContentType,
  });
  return getSignedUrl(this.client, command, { expiresIn: input.expiresIn ?? 3600 });
}
```

---

### 6. App Registration

**File affected:** `src/app.ts`

**What changed:**
- Minor 1-line change related to route import/registration adjustment.

---

## Summary

| Area | Impact |
|------|--------|
| Upload Asset | Breaking — removed DB persistence, list/delete endpoints; added category-based uploads |
| Shop Service | Enhancement — automatic cleanup of old media on logo/banner update |
| Seller Service | Enhancement — KYC documents now served via signed URLs with expiry |
| GST Service | Enhancement — mock mode for testing, better error handling and response parsing |
| Storage Interface | Enhancement — signed URLs now support content disposition and type options |
| App | Minor — route adjustment |
