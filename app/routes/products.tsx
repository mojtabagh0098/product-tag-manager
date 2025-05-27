import { json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Page, Card, Text } from "@shopify/polaris";
import { useLoaderData } from "@remix-run/react";

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

export default function ProductList() {
  const { products } = useLoaderData<typeof loader>();

  return (
    <Page title="Products">
      {products.map((product: any) => (
        <Card key={product.id}>
          <Text variant="bodySm" as="p">
            Handle: {product.handle}
          </Text>
        </Card>
      ))}
    </Page>
  );
}
