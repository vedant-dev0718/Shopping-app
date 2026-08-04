# Product CRUD + Reel Product Fetch Contract (Backend -> Frontend)

Date: 2026-08-03
Owner: Backend Service Handler
Consumer: Frontend agent (shared Kotlin UI + repositories)
Status: Contract closed for frontend implementation

## 1) Scope

This contract covers:
- Seller product CRUD
- Seller reel create/update with product tagging
- Buyer-side reel/feed product fetch used in the reels ("feels") section
- Tracking hooks that frontend must call for analytics parity

This contract does not include:
- New backend endpoints
- Breaking payload changes
- Search contract redesign

## 2) Contract Summary

Backend already exposes the required endpoints and validation for:
- Product CRUD under /api/seller/products
- Reel CRUD under /api/seller/reels
- Reel tagged products under /api/reels/:id/products
- Mixed discovery feed under /api/discovery/feed

Frontend should implement against the existing backend contract as-is.

## 3) Phase Plan

### Phase 0 - Contract Freeze

Goal:
- Align frontend models and repository decoding to actual backend response shapes.

Decisions:
- Keep backend response envelope unchanged: { success, message, data }
- Keep route paths unchanged
- Keep field names unchanged

Definition of done:
- Frontend DTO mapping updated for all endpoints listed in this doc.

### Phase 1 - Seller Product CRUD Integration

Goal:
- Seller can create, list, edit, and delete products.

Endpoints:
- GET /api/seller/products
- POST /api/seller/products
- PATCH /api/seller/products/:id
- DELETE /api/seller/products/:id

Auth:
- Bearer token required
- Seller role required

Request shape (create):
- title: string (required)
- description: string (required)
- category: string (required)
- region: string (required)
- price: number >= 0 (required)
- stock: integer >= 0 (optional, defaults to 0)
- productLink: valid http/https URL (optional)
- subcategory: string (optional)
- tags: string[] (optional)
- imageUrls: URL[] (optional)
- featured: boolean (optional)
- status: one of active/sold_out/inactive (optional)
- storeId: Mongo id (optional)

Request shape (update):
- Same fields as create, all optional.

Response notes:
- Create and update return full Product object in data.
- Delete returns data: { productId, deleted: true }.

Business rules:
- Product belongs only to authenticated seller.
- If stock becomes 0, status auto-resolves to sold_out (except kyc_pending path).

Definition of done:
- Seller product lifecycle UI uses these endpoints end-to-end.

### Phase 2 - Reel Authoring With Product Tagging

Goal:
- Seller can tag existing products while creating/editing reels.

Endpoints:
- GET /api/seller/products (source list for tag picker)
- POST /api/seller/reels
- PATCH /api/seller/reels/:id
- DELETE /api/seller/reels/:id

Auth:
- Bearer token required
- Seller role required

Reel request requirements:
- taggedProductIds is required on create, size 1..3
- Each tagged product id must belong to same seller and store as reel
- On update, taggedProductIds optional, but if provided must still satisfy 1..3 + ownership

Response notes:
- Reel list/get payload returns taggedProductIds as populated Product objects, not only string ids.
- Frontend should treat taggedProductIds in response as product cards for reel UI.

Definition of done:
- Reel upload/edit flow supports selecting 1..3 seller products and persists correctly.

### Phase 3 - Buyer Reels + Product Fetch

Goal:
- Buyer can see product cards attached to reels and open product details from reels.

Endpoints:
- GET /api/reels
- GET /api/reels/:id
- GET /api/reels/:id/products
- GET /api/discovery/feed
- GET /api/products/:id

Auth:
- Optional auth for reads
- With buyer token, responses include personalization flags (isLiked/isSaved)

Important response contract:
- /api/reels and /api/reels/:id return Reel objects where taggedProductIds is populated product object array.
- /api/reels/:id/products returns product array for that reel.
- /api/discovery/feed returns mixed items in this shape:
  - { type: "product" | "reel", createdAt, data: <Product or Reel> }
  - It does not return { product: ..., reel: ... }.

Definition of done:
- Reels UI can render attached products and navigate to product detail.
- Discovery feed parser supports mixed type + data payload.

### Phase 4 - Engagement Tracking Hooks

Goal:
- Preserve analytics signal quality from app interactions.

Endpoints to call:
- POST /api/reels/:id/view when reel view starts/qualifies
- POST /api/products/:id/click when product card/link is opened from reels/feed
- POST /api/products/:id/save and DELETE /api/products/:id/save for buyer save actions

Definition of done:
- Tracking calls are wired to user actions and errors are non-blocking for UX.

### Phase 5 - QA and Rollout

Goal:
- Validate contract compatibility and remove mock-only fallback in target paths.

Checks:
- Seller creates product -> appears in seller list
- Seller tags product in reel -> buyer sees product in reel
- Buyer opens product from reel -> click event recorded
- Save/unsave updates UI state from backend response
- Feed parser handles both product and reel item types

Definition of done:
- All flows pass in staging with live API base URL.

## 4) Frontend Agent Implementation Checklist

1. Update feed DTO parsing to support: item.type + item.data.
2. Update reel DTO mapping so taggedProductIds can decode populated Product objects in responses.
3. Keep create/update reel request using taggedProductIds as string id list.
4. Update save/unsave response mapping to backend shape:
   - data.saved (boolean)
   - data.saveCount (number)
   - data.productId (string)
5. Update delete response mapping to support returned id fields:
   - product delete: data.productId + data.deleted
   - reel delete: data.reelId + data.deleted
6. In reel upload/edit screen, fetch seller products from GET /api/seller/products and enforce 1..3 tag selection in UI.
7. Wire analytics hooks for reel view and product click.

## 5) Known Compatibility Gaps To Handle In Frontend

- Discovery feed model in shared currently assumes product/reel split fields; backend sends a single data field.
- Reel model in shared currently assumes taggedProductIds as string list; backend sends populated product objects for read APIs.
- Save product response model in shared currently expects isSaved; backend returns saved.

No backend changes are required to proceed with frontend implementation.

## 6) Security and Validation Notes

- Seller endpoints must always include Bearer token and seller role.
- Buyer save/unsave requires buyer token.
- Product and reel ids are validated as Mongo ids and return 400 for invalid ids.
- Product/reel visibility for buyers is filtered by status and safety rules.

## 7) Handoff Conclusion

Contract is closed for frontend execution.
Frontend agent should implement UI/data-layer changes per phases 1-5 using the endpoint and payload definitions above.
