import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
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
import { XSmallIcon } from "@shopify/polaris-icons";

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
  const removeTag = form.get("removeTag")?.toString();

  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (removeTag && productId) {
    // حذف تگ
    const existing = await prisma.productTag.findUnique({
      where: { productId_shop: { productId, shop } },
    });

    if (existing) {
      await prisma.productTag.update({
        where: { productId_shop: { productId, shop } },
        data: {
          tags: { set: existing.tags.filter((t) => t !== removeTag) },
        },
      });
    }

    return redirect("/products");
  }

  if (!tag || !productId) return redirect("/products");

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

  const handleRemove = (productId: string, tag: string) => {
    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("removeTag", tag);
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <Page>
      {products.map((product: any) => {
        const productTags =
          tags.find((t: any) => t.productId === product.id)?.tags || [];

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
                //   <Box
                //     key={index}
                //     paddingInline="300"
                //     paddingBlock="200"
                //     background="bg-surface-secondary"
                //     borderRadius="200"
                //   >
                //     <Text as="span" variant="bodySm" tone="subdued">
                //       #{tag}
                //     </Text>
                //     <Button
                //       icon={<Icon source={XSmallIcon} tone="base" />}
                //       accessibilityLabel={`Remove ${tag}`}
                //       size="micro"
                //       variant="plain"
                //       onClick={() => handleRemove(product.id, tag)}
                //     />
                //   </Box>
                <h3 key={index}>hkjh</h3>
                ))}
              </InlineStack>
            )}

            {/* فرم افزودن تگ */}
            <form method="post">
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
            </form>
          </Card>
        );
      })}
    </Page>
  );
}
