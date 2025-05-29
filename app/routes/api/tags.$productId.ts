import { json, LoaderFunctionArgs } from "@remix-run/node";
import prisma from "../../db.server";

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { productId } = params;

  if (!productId) {
    return json({ error: "Missing productId" }, { status: 400 });
  }

  const record = await prisma.productTag.findFirst({
    where: { productId },
  });

  return json({
    productId,
    tags: record?.tags || [],
  });
};
