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
  AppProvider,
  Page,
  Card,
  InlineStack,
  Text,
  TextField,
  Button,
  Box,
  Icon,
} from "@shopify/polaris";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { useState } from "react";
import {
  XSmallIcon
} from '@shopify/polaris-icons';

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
  const { products, tags } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [formStates, setFormStates] = useState<Record<string, string>>({});

  const handleChange = (productId: string, value: string) => {
    setFormStates((prev) => ({ ...prev, [productId]: value }));
  };

  return (
    <div>
        {products.map((product: any) => {
            const productTags = tags.find(
            (t: any) => t.productId === product.id
            )?.tags || [];

            return (
            <Card key={product.id} padding="400">
                <Box paddingBlockEnd="300">
                <Text as="p" variant="bodySm" tone="subdued">
                    Handle: {product.handle}
                </Text>
                </Box>

                {/* نمایش تگ‌ها */}
                {productTags.length > 0 && (
                <InlineStack gap="200" wrap>
                    {productTags.map((tag: string, index: number) => (
                    <fetcher.Form method="post" key={index}>
                        <input
                        type="hidden"
                        name="productId"
                        value={product.id}
                        />
                        <input type="hidden" name="removeTag" value={tag} />
                        <Box
                        paddingInline="300"
                        paddingBlock="200"
                        background="bg-surface-secondary"
                        borderRadius="200"
                        >
                        <Text as="span" variant="bodySm" tone="subdued">
                            #{tag}
                        </Text>
                        <Button
                            icon={<Icon source={XSmallIcon} tone="base" />}
                            accessibilityLabel={`Remove ${tag}`}
                            size="micro"
                            variant="plain"
                        />
                        </Box>
                    </fetcher.Form>
                    ))}
                </InlineStack>
                )}

                {/* فرم افزودن تگ */}
                <fetcher.Form method="post">
                <input type="hidden" name="productId" value={product.id} />
                <InlineStack gap="300" align="center">
                    <Box maxWidth="300px">
                    <TextField
                        label="Add tag"
                        labelHidden
                        name="tag"
                        autoComplete="off"
                        value={formStates[product.id] || ""}
                        onChange={(value) => handleChange(product.id, value)}
                    />
                    </Box>
                    <Button submit variant="primary">
                    Add
                    </Button>
                </InlineStack>
                </fetcher.Form>
            </Card>
            );
        })}
    </div>
  );
}
