import { useLoaderData, useFetcher } from "react-router";
import { useEffect, useCallback } from "react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

import {
  Page,
  Layout,
  Card,
  ResourceList,
  ResourceItem,
  Text,
  Badge,
  Button,
  Thumbnail,
  BlockStack,
  InlineStack,
  Banner,
  EmptyState,
  Divider,
  Box,
} from "@shopify/polaris";
import { ImageIcon } from "@shopify/polaris-icons";

// ─── Loader ───────────────────────────────────────────────────────────────────

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query getProducts {
        products(first: 20) {
          edges {
            node {
              id
              title
              status
              featuredMedia {
                preview {
                  image {
                    url
                    altText
                  }
                }
              }
              widgetEnabled: metafield(namespace: "custom", key: "widget_enabled") {
                id
                value
              }
            }
          }
        }
      }`
  );

  const responseJson = await response.json();
  const products = responseJson.data.products.edges.map(({ node }) => ({
    id: node.id,
    title: node.title,
    status: node.status,
    imageUrl: node.featuredMedia?.preview?.image?.url || null,
    imageAlt: node.featuredMedia?.preview?.image?.altText || node.title,
    widgetEnabled: node.widgetEnabled?.value === "true",
  }));

  return { products };
};

// ─── Action ───────────────────────────────────────────────────────────────────

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const productId = formData.get("productId");
  const enabled = formData.get("enabled");

  const response = await admin.graphql(
    `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            namespace
            key
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
    {
      variables: {
        metafields: [
          {
            ownerId: productId,
            namespace: "custom",
            key: "widget_enabled",
            type: "boolean",
            value: enabled,
          },
        ],
      },
    }
  );

  const responseJson = await response.json();
  const userErrors = responseJson.data?.metafieldsSet?.userErrors;

  if (userErrors && userErrors.length > 0) {
    return { success: false, errors: userErrors };
  }

  return { success: true, productId, enabled };
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Index() {
  const { products } = useLoaderData();
  const shopify = useAppBridge();

  const enabledCount = products.filter((p) => p.widgetEnabled).length;
  const disabledCount = products.length - enabledCount;

  return (
    <Page
      title="Product Widget Manager"
      subtitle="Enable or disable the custom widget per product. Changes sync instantly to Shopify."
    >
      <Layout>
        {/* ── Summary Banner ── */}
        <Layout.Section>
          <Banner tone="info">
            <InlineStack gap="400" align="start">
              <Text as="span">
                <Text as="span" fontWeight="bold">{enabledCount}</Text> product{enabledCount !== 1 ? "s" : ""} with widget enabled
                &nbsp;·&nbsp;
                <Text as="span" fontWeight="bold">{disabledCount}</Text> disabled
              </Text>
            </InlineStack>
          </Banner>
        </Layout.Section>

        {/* ── Product List ── */}
        <Layout.Section>
          <Card padding="0">
            {products.length === 0 ? (
              <EmptyState
                heading="No products found"
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Your store doesn't have any products yet. Add products in Shopify to manage widgets here.</p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={products}
                renderItem={(product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    shopify={shopify}
                  />
                )}
              />
            )}
          </Card>
        </Layout.Section>


      </Layout>
    </Page>
  );
}

// ─── Product Row ──────────────────────────────────────────────────────────────

function ProductRow({ product, shopify }) {
  const fetcher = useFetcher();

  const isSubmitting = fetcher.state !== "idle";
  const optimisticEnabled = isSubmitting
    ? fetcher.formData?.get("enabled") === "true"
    : product.widgetEnabled;

  useEffect(() => {
    if (fetcher.data?.success) {
      const label = fetcher.data.enabled === "true" ? "enabled" : "disabled";
      shopify.toast.show(`Widget ${label} for "${product.title}"`, {
        duration: 3000,
      });
    }
    if (fetcher.data?.errors) {
      shopify.toast.show(`Failed to update "${product.title}"`, {
        isError: true,
      });
    }
  }, [fetcher.data]);

  const handleToggle = useCallback(() => {
    const newValue = optimisticEnabled ? "false" : "true";
    fetcher.submit(
      { productId: product.id, enabled: newValue },
      { method: "POST" }
    );
  }, [optimisticEnabled, product.id, fetcher]);

  return (
    <ResourceItem
      id={product.id}
      media={
        <Thumbnail
          source={product.imageUrl || ImageIcon}
          alt={product.imageAlt}
          size="small"
        />
      }
      accessibilityLabel={`Manage widget for ${product.title}`}
    >
      <InlineStack align="space-between" blockAlignment="center" wrap={false} gap="400">
        {/* Title + Store Status */}
        <BlockStack gap="100">
          <Text variant="bodyMd" fontWeight="semibold" as="span">
            {product.title}
          </Text>
          <Badge tone={product.status === "ACTIVE" ? "success" : "warning"}>
            {product.status === "ACTIVE" ? "Active" : "Draft"}
          </Badge>
        </BlockStack>

        {/* Widget Status + Toggle */}
        <InlineStack gap="300" blockAlignment="center">
          <Badge tone={optimisticEnabled ? "success" : "enabled"}>
            {optimisticEnabled ? "Widget On" : "Widget Off"}
          </Badge>
          <Button
            variant={optimisticEnabled ? "secondary" : "primary"}
            tone={optimisticEnabled ? "critical" : undefined}
            onClick={handleToggle}
            loading={isSubmitting}
            size="slim"
          >
            {optimisticEnabled ? "Disable" : "Enable"}
          </Button>
        </InlineStack>
      </InlineStack>
    </ResourceItem>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};