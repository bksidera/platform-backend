CREATE TYPE "FrameStatus" AS ENUM ('active', 'archived');
CREATE TYPE "CardPaymentStatus" AS ENUM ('none', 'pending', 'succeeded', 'failed');

CREATE TABLE "Frame" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "context" TEXT,
    "slug" TEXT NOT NULL,
    "status" "FrameStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Frame_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "frameId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "streamId" TEXT,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "note" VARCHAR(240),
    "photoUrl" TEXT,
    "photoModerationStatus" "ModerationStatus",
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "paymentStatus" "CardPaymentStatus" NOT NULL DEFAULT 'none',
    "visibility" "Visibility" NOT NULL DEFAULT 'public',
    "hiddenByCreator" BOOLEAN NOT NULL DEFAULT false,
    "reportedAt" TIMESTAMP(3),
    "reportReason" VARCHAR(240),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Event" ADD COLUMN "frameId" TEXT;
ALTER TABLE "Event" ADD COLUMN "cardId" TEXT;

CREATE UNIQUE INDEX "Frame_slug_key" ON "Frame"("slug");
CREATE INDEX "Frame_creatorId_idx" ON "Frame"("creatorId");
CREATE UNIQUE INDEX "Card_streamId_key" ON "Card"("streamId");
CREATE INDEX "Card_frameId_createdAt_idx" ON "Card"("frameId", "createdAt");
CREATE INDEX "Card_creatorId_createdAt_idx" ON "Card"("creatorId", "createdAt");
CREATE INDEX "Card_giverId_idx" ON "Card"("giverId");
CREATE INDEX "Event_frameId_idx" ON "Event"("frameId");
CREATE INDEX "Event_cardId_idx" ON "Event"("cardId");

ALTER TABLE "Frame" ADD CONSTRAINT "Frame_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Card" ADD CONSTRAINT "Card_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "Frame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Card" ADD CONSTRAINT "Card_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Card" ADD CONSTRAINT "Card_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "Giver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Card" ADD CONSTRAINT "Card_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE SET NULL ON UPDATE CASCADE;
