import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { Card, Page } from "@shopify/polaris";
import prisma from "../../db.server";

type ProductTag = {
  id: string; // Adjusted to match serialized data
  productId: string; // Adjusted to match serialized data
  tags: string[];
};

export const loader = async () => {
  const tags = await prisma.productTag.findMany();
  return json({ tags });
};

export default function Index() {
  const { tags } = useLoaderData<typeof loader>();

  return (
    <Page title="Product Tags Manager">
      {tags.map((tag: ProductTag) => (
        <Card key={tag.id} padding="400" roundedAbove="sm">
          <h2>Product ID: {tag.productId}</h2>
          <p>{tag.tags.join(", ")}</p>
        </Card>
      ))}
    </Page>
  );
}
