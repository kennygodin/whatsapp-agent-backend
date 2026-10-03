-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "nudgedAt" TIMESTAMP(3),
ADD COLUMN     "paymentLinkSentAt" TIMESTAMP(3);
