/*
  Warnings:

  - You are about to drop the column `recurrencePeriod` on the `Transaction` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('SAVINGS', 'CREDIT_CARD');

-- AlterEnum
ALTER TYPE "RecurrencePeriod" ADD VALUE 'WEEKLY';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "creditLimit" DOUBLE PRECISION,
ADD COLUMN     "type" "AccountType" NOT NULL DEFAULT 'SAVINGS';

-- AlterTable
ALTER TABLE "Debt" ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "bankCurrentRemaining" DOUBLE PRECISION,
ADD COLUMN     "disbursementAmount" DOUBLE PRECISION,
ADD COLUMN     "disbursementDate" TIMESTAMP(3),
ADD COLUMN     "effectiveAnnualRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "recurrencePeriod",
ADD COLUMN     "exchangeRate" DOUBLE PRECISION,
ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ADD COLUMN     "originalCurrency" "Currency",
ADD COLUMN     "recurringItemId" TEXT,
ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'PAID';

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "fromAccountId" TEXT NOT NULL,
    "toAccountId" TEXT NOT NULL,
    "amountSource" DOUBLE PRECISION NOT NULL,
    "amountDest" DOUBLE PRECISION NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "defaultAmount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'COP',
    "period" "RecurrencePeriod" NOT NULL,
    "categoryId" TEXT NOT NULL,
    "defaultAccountId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringItemId_fkey" FOREIGN KEY ("recurringItemId") REFERENCES "RecurringItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringItem" ADD CONSTRAINT "RecurringItem_defaultAccountId_fkey" FOREIGN KEY ("defaultAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
