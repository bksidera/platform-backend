-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ArchiveVisibility" AS ENUM ('aggregate_only', 'show_opted_in');

-- CreateEnum
CREATE TYPE "GiverStatus" AS ENUM ('guest', 'claimed');

-- CreateEnum
CREATE TYPE "MonumentStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "StreamType" AS ENUM ('moment', 'stewardship_charge');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('pending', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('pending', 'approved', 'held');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('private', 'public');

-- CreateEnum
CREATE TYPE "StewardshipStatus" AS ENUM ('active', 'lapsed', 'canceled');

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "bio" TEXT,
    "heroImageUrl" TEXT,
    "mediaLinks" JSONB,
    "stripeAccountId" TEXT,
    "stripeOnboarded" BOOLEAN NOT NULL DEFAULT false,
    "archiveVisibility" "ArchiveVisibility" NOT NULL DEFAULT 'aggregate_only',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Giver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" "GiverStatus" NOT NULL DEFAULT 'guest',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Giver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Monument" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "qrSourceSlug" TEXT NOT NULL,
    "status" "MonumentStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Monument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stream" (
    "id" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "monumentId" TEXT,
    "type" "StreamType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "StreamStatus" NOT NULL DEFAULT 'pending',
    "stripePaymentIntentId" TEXT,
    "venueStamp" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "monumentId" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "glyph" TEXT NOT NULL,
    "observationText" VARCHAR(240),
    "photoUrl" TEXT,
    "photoModerationStatus" "ModerationStatus",
    "visibility" "Visibility" NOT NULL DEFAULT 'private',
    "hiddenByCreator" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stewardship" (
    "id" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "StewardshipStatus" NOT NULL DEFAULT 'active',
    "stripeSubscriptionId" TEXT NOT NULL,
    "visibility" "Visibility" NOT NULL DEFAULT 'private',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Stewardship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Countersignature" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "inscriptionId" TEXT,
    "streamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Countersignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceSlug" TEXT,
    "creatorId" TEXT,
    "monumentId" TEXT,
    "giverId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Creator_slug_key" ON "Creator"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_email_key" ON "Creator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_stripeAccountId_key" ON "Creator"("stripeAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Giver_email_key" ON "Giver"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Monument_qrSourceSlug_key" ON "Monument"("qrSourceSlug");

-- CreateIndex
CREATE INDEX "Monument_creatorId_idx" ON "Monument"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Stream_stripePaymentIntentId_key" ON "Stream"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Stream_creatorId_occurredAt_idx" ON "Stream"("creatorId", "occurredAt");

-- CreateIndex
CREATE INDEX "Stream_giverId_idx" ON "Stream"("giverId");

-- CreateIndex
CREATE UNIQUE INDEX "Inscription_streamId_key" ON "Inscription"("streamId");

-- CreateIndex
CREATE INDEX "Inscription_monumentId_idx" ON "Inscription"("monumentId");

-- CreateIndex
CREATE INDEX "Inscription_giverId_idx" ON "Inscription"("giverId");

-- CreateIndex
CREATE UNIQUE INDEX "Stewardship_stripeSubscriptionId_key" ON "Stewardship"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Stewardship_creatorId_status_idx" ON "Stewardship"("creatorId", "status");

-- CreateIndex
CREATE INDEX "Stewardship_giverId_idx" ON "Stewardship"("giverId");

-- CreateIndex
CREATE UNIQUE INDEX "Countersignature_inscriptionId_key" ON "Countersignature"("inscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Countersignature_streamId_key" ON "Countersignature"("streamId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_token_key" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE INDEX "MagicLinkToken_email_idx" ON "MagicLinkToken"("email");

-- CreateIndex
CREATE INDEX "Event_type_createdAt_idx" ON "Event"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Event_monumentId_idx" ON "Event"("monumentId");

-- AddForeignKey
ALTER TABLE "Monument" ADD CONSTRAINT "Monument_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "Giver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_monumentId_fkey" FOREIGN KEY ("monumentId") REFERENCES "Monument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "Giver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_monumentId_fkey" FOREIGN KEY ("monumentId") REFERENCES "Monument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stewardship" ADD CONSTRAINT "Stewardship_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "Giver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stewardship" ADD CONSTRAINT "Stewardship_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Countersignature" ADD CONSTRAINT "Countersignature_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Countersignature" ADD CONSTRAINT "Countersignature_inscriptionId_fkey" FOREIGN KEY ("inscriptionId") REFERENCES "Inscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Countersignature" ADD CONSTRAINT "Countersignature_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

