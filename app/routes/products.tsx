import type {
  LoaderFunctionArgs,
  ActionFunctionArgs} from "@remix-run/node";
import {
  json,
  redirect,
} from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { Page, Card, TextField, Button, Text } from "@shopify/polaris";
import { useState } from "react";

import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { AppProvider } from "@shopify/shopify-app-remix/react";

// 1️⃣ Loader: گرفتن محصولات از Shopify Admin API
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

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

  return json({ products });
};

// 2️⃣ Action: ذخیره کردن تگ‌ها در دیتابیس Postgres
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

// 3️⃣ کامپوننت UI: نمایش فرم و محصولات
export default function ProductList() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [formStates, setFormStates] = useState<Record<string, string>>({});

  const handleChange = (productId: string, value: string) => {
    setFormStates((prev) => ({ ...prev, [productId]: value }));
  };


  return (
    <AppProvider apiKey={process.env.SHOPIFY_API_KEY || ""}>
        <Page title="Products">
        {products.map((product: any) => (
            <Card key={product.id}>
            <Text as="span">
                {product.title}
            </Text>
            <Text variant="bodySm" as="p">
                Handle: {product.handle}
            </Text>
            <fetcher.Form method="post">
                <input type="hidden" name="productId" value={product.id} />
                {/* <HorizontalStack alignment="center"> */}
                <TextField
                    label="Add tag"
                    labelHidden
                    name="tag"
                    value={formStates[product.id] || ""}
                    onChange={(value) => handleChange(product.id, value)}
                    autoComplete="off"
                />
                <Button submit variant="primary">
                    Add
                </Button>
                {/* </HorizontalStack> */}
            </fetcher.Form>
            </Card>
        ))}
        </Page>
    </AppProvider>
  );
}
