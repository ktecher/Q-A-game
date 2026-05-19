# `content/` — seed sources for Supabase

These CSV files feed the seed scripts in `scripts/`. Two contracts coexist
because the two scripts have different philosophies:

## Tracked (canonical, version-controlled)

| File | Used by | Notes |
|---|---|---|
| `questions-with-images.csv` | `scripts/seed.js` | Canonical question pool for the 30 standard categories (180 rows = 30 cats × 6). |
| `challenge-prompts.csv` | `scripts/seed-challenge-prompts.js` | Canonical Challenge Round prompts (32 bilingual entries). Run the seeder after editing to push changes to Supabase. |
| `wala-kalma-titles.csv` | `scripts/seed-wala-kalma-titles.js` | Canonical Wala Kalma (charades) titles — 90 entries × 3 categories (english / arabic / gulf), 10 per difficulty tier. Run the seeder after editing to push changes to Supabase. |
| `questions-all.csv` | (legacy) | Older flat dump without image_url. Kept for reference. |
| `category-images.csv`, `category-images-500.csv`, `category-images-blank.csv` | (author) | Reference grids of category cover images. |
| `image-research/` | (author) | Chunked research output from when categories were curated. |

## Gitignored (locally regenerated)

| File | Why ignored | How to regenerate |
|---|---|---|
| `guess-the-movie.csv` | Tightly coupled to a local image folder + Cloudinary uploads — not portable across machines without the same source images. | See **Regenerating guess-the-movie.csv** below. |
| `*.xlsx` | Author working spreadsheets — converted to CSV before commit. | Open the CSV in Excel and save-as `.xlsx` if you need to edit visually. |

## Regenerating `guess-the-movie.csv`

1. Put movie scene images in a local folder (e.g. `~/Desktop/movie scenes/`).
2. Make sure `.env.local` has `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
3. Upload to Cloudinary:
   ```bash
   node scripts/upload-movie-scenes.js "~/Desktop/movie scenes/"
   ```
   This writes `scripts/output/cloudinary-urls.json` (filename → URL map).
4. Author the bilingual Q&A in `content/guess-the-movie.csv` with columns:
   `category_slug,category_en,difficulty,question_ar,question_en,answer_ar,answer_en,image_url,source_filename,notes`
5. Seed into Supabase:
   ```bash
   node scripts/seed-guess-the-movie.js
   ```

## Generated, gitignored

Anything under `scripts/output/` is a script artifact and excluded from git.
