-- AlterTable: resumable campaign slots (RunSlot[]) on the player's progress.
ALTER TABLE "PlayerProgress" ADD COLUMN "runs" JSONB;
