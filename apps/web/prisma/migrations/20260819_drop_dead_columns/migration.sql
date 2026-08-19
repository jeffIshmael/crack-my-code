-- AlterTable: drop dead columns from Game
ALTER TABLE "Game" DROP COLUMN IF EXISTS "cipherRewardPaid";
ALTER TABLE "Game" DROP COLUMN IF EXISTS "cipherRewardAmount";
ALTER TABLE "Game" DROP COLUMN IF EXISTS "cipherRewardTxHash";

-- AlterTable: drop dead column from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "rating";
