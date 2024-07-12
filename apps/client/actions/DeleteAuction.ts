"use server";
import prisma from "@repo/db";

export const deleteAuction = async (id: string) => {
  try {
    const auction = await prisma.auction.findUnique({
      where: {
        id: id,
      },
    });
    if (!auction) {
      throw new Error("Auction not found");
    }
    if (auction.status !== "INACTIVE") {
      throw new Error("Auction is not in draft status");
    }
    await prisma.auction.delete({
      where: {
        id: id,
      },
    });
  } catch (error) {
    throw error;
  }

  return {};
};
