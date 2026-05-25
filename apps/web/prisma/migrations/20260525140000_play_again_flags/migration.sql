-- AlterTable
ALTER TABLE "Game" ADD COLUMN "player1WantsRematch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Game" ADD COLUMN "player2WantsRematch" BOOLEAN NOT NULL DEFAULT false;
