-- CreateTable
CREATE TABLE "RunScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL,
    "headshots" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "difficulty" TEXT NOT NULL,
    "won" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RunScore_score_idx" ON "RunScore"("score");

-- CreateIndex
CREATE INDEX "RunScore_createdAt_idx" ON "RunScore"("createdAt");

-- CreateIndex
CREATE INDEX "RunScore_userId_idx" ON "RunScore"("userId");

-- AddForeignKey
ALTER TABLE "RunScore" ADD CONSTRAINT "RunScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
