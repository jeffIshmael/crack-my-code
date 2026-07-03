-- AlterTable
ALTER TABLE "User" ADD COLUMN "smartWalletAddress" TEXT;

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "cipherRewardPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Game" ADD COLUMN "cipherRewardAmount" DOUBLE PRECISION;
ALTER TABLE "Game" ADD COLUMN "cipherRewardTxHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_smartWalletAddress_key" ON "User"("smartWalletAddress");
