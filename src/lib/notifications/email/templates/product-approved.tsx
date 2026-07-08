import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Preview,
} from "@react-email/components";

interface Props {
  sellerName: string;
  productName: string;
  dashboardUrl: string;
  note?: string;
}

export function ProductApprovedEmail({
  sellerName,
  productName,
  dashboardUrl,
  note,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your product has been approved</Preview>
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f9fafb" }}>
        <Container
          style={{
            maxWidth: 600,
            margin: "40px auto",
            background: "#fff",
            borderRadius: 8,
            padding: 32,
          }}
        >
          <Heading style={{ color: "#16a34a" }}>Product Approved ✓</Heading>
          <Text>Hi {sellerName},</Text>
          <Text>
            Your product <strong>{productName}</strong> has been reviewed and
            approved. It is now live and visible to customers.
          </Text>
          {note && (
            <Text
              style={{
                background: "#f0fdf4",
                padding: 16,
                borderRadius: 6,
                borderLeft: "4px solid #16a34a",
              }}
            >
              <strong>Reviewer note:</strong> {note}
            </Text>
          )}
          <Button
            href={dashboardUrl}
            style={{
              background: "#16a34a",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            View Product
          </Button>
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            ETradeBazaar Seller Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
