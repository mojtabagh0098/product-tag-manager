import type {
  LoaderFunctionArgs,
  ActionFunctionArgs} from "@remix-run/node";
import {
  json,
  redirect,
} from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
  Page,
//   Card,
//   InlineStack,
//   Text,
//   TextField,
//   Button,
//   Box,
//   Icon,
} from "@shopify/polaris";
// import { useLoaderData, useFetcher } from "@remix-run/react";
// import { useState } from "react";
// import {
//   XSmallIcon
// } from '@shopify/polaris-icons';

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  const response = await admin.graphql(`
    {
      products(first: 10) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `);

  const data = await response.json();

  const products = data.data.products.edges.map((edge: any) => edge.node);

  const tags = await prisma.productTag.findMany({
    where: { shop },
  });

  return json({ products, tags });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const form = await request.formData();
  const tag = form.get("tag")?.toString().trim();
  const productId = form.get("productId")?.toString();

  if (!tag || !productId) return redirect("/products");

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  const existing = await prisma.productTag.findUnique({
    where: { productId_shop: { productId, shop } },
  });

  if (existing) {
    await prisma.productTag.update({
      where: { productId_shop: { productId, shop } },
      data: {
        tags: { push: tag },
      },
    });
  } else {
    await prisma.productTag.create({
      data: {
        shop,
        productId,
        tags: [tag],
      },
    });
  }

  return redirect("/products");
};

export default function ProductList() {
//   const { products, tags } = useLoaderData<typeof loader>();
//   const fetcher = useFetcher();
//   const [formStates, setFormStates] = useState<Record<string, string>>({});

//   const handleChange = (productId: string, value: string) => {
//     setFormStates((prev) => ({ ...prev, [productId]: value }));
//   };

  return (
    <Page>
        products
    </Page>
  );
}
