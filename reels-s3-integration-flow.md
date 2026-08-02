# Reels S3 Integration Flow

## Goal
Enable seller reel upload and CRUD in backend, persist media in AWS S3, and let buyers consume those reel URLs from the feed.

## End-to-end flow
1. Seller picks a video and optional cover image in app.
2. App uploads binary media to backend:
   - `POST /api/uploads/video` (multipart field: `video`)
   - `POST /api/uploads/image` (multipart field: `image`, optional)
3. Backend uploads file to S3 and returns a public URL + object key (`publicId`).
4. App calls reel create endpoint with returned URLs:
   - `POST /api/seller/reels`
   - body includes `videoUrl`, `thumbnailUrl`, `caption`, `region`, `category`, `taggedProductIds`.
5. Backend stores reel metadata in MongoDB.
6. Buyer feed calls `GET /api/reels` and renders `videoUrl` for playback.
7. Seller can manage reels with:
   - `GET /api/seller/reels`
   - `PATCH /api/seller/reels/:id`
   - `DELETE /api/seller/reels/:id`

## Storage behavior
- Upload provider priority: AWS S3 first, Cloudinary fallback.
- Backend upload response contract is unchanged:
  - Video upload: `videoUrl`, `thumbnailUrl`, `publicId`
  - Image upload: `imageUrl`, `publicId`
- Reel documents continue storing media URLs in `videoUrl` and `thumbnailUrl`.

## Required TODOs (credentials/config)
- [ ] Add `AWS_REGION`.
- [ ] Add `AWS_S3_BUCKET`.
- [ ] Add `AWS_ACCESS_KEY_ID`.
- [ ] Add `AWS_SECRET_ACCESS_KEY`.
- [ ] Ensure bucket objects are publicly readable or fronted by CDN.
- [ ] (Optional) Add `AWS_S3_PUBLIC_BASE_URL` for CloudFront/custom CDN.
- [ ] (Optional) Add `AWS_S3_ENDPOINT` + `AWS_S3_FORCE_PATH_STYLE` for S3-compatible providers.

## Validation checklist
- [ ] Seller video upload returns `201` and valid `videoUrl`.
- [ ] Seller optional thumbnail upload returns `201` and valid `imageUrl`.
- [ ] Reel create with returned URLs succeeds (`201`).
- [ ] Buyer feed `GET /api/reels` shows the new reel.
- [ ] Reel delete removes it from seller list and buyer feed.
- [ ] S3 object URL is playable from iOS app.
