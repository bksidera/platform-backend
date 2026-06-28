-- Remove retired Monument / Inscription data model.
-- Destructive by design: the product has cut over to Living Frame / Card.

ALTER TABLE "Countersignature" DROP CONSTRAINT IF EXISTS "Countersignature_inscriptionId_fkey";
ALTER TABLE "Inscription" DROP CONSTRAINT IF EXISTS "Inscription_streamId_fkey";
ALTER TABLE "Inscription" DROP CONSTRAINT IF EXISTS "Inscription_giverId_fkey";
ALTER TABLE "Inscription" DROP CONSTRAINT IF EXISTS "Inscription_monumentId_fkey";
ALTER TABLE "Stream" DROP CONSTRAINT IF EXISTS "Stream_monumentId_fkey";
ALTER TABLE "Monument" DROP CONSTRAINT IF EXISTS "Monument_creatorId_fkey";

DROP INDEX IF EXISTS "Countersignature_inscriptionId_key";
DROP INDEX IF EXISTS "Event_monumentId_idx";

ALTER TABLE "Countersignature" DROP COLUMN IF EXISTS "inscriptionId";
ALTER TABLE "Stream" DROP COLUMN IF EXISTS "monumentId";
ALTER TABLE "Event" DROP COLUMN IF EXISTS "monumentId";

DROP TABLE IF EXISTS "Inscription";
DROP TABLE IF EXISTS "Monument";

DROP TYPE IF EXISTS "MonumentStatus";
