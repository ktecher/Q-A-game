-- ════════════════════════════════════════════════════════════════════
--   Add optional image_url to questions (Cloudinary-hosted)
--   Migration: 0002_question_image
-- ════════════════════════════════════════════════════════════════════
--
-- Stores a full delivery URL (e.g. https://res.cloudinary.com/<cloud>/...).
-- Nullable: most questions remain text-only.
-- Inherits the existing public-read RLS policy on questions.

alter table questions
  add column if not exists image_url text;
