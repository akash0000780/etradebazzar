import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
  Preview,
} from "@react-email/components";

interface Props {
  sellerName: string;
  productName: string;
  reason: string;
}

export function ProductRejectedEmail({
  sellerName,
  productName,
  reason,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your product needs attention</Preview>
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
          <Heading style={{ color: "#dc2626" }}>Product Rejected</Heading>
          <Text>Hi {sellerName},</Text>
          <Text>
            Your product <strong>{productName}</strong> could not be approved at
            this time.
          </Text>
          <Text
            style={{
              background: "#fef2f2",
              padding: 16,
              borderRadius: 6,
              borderLeft: "4px solid #dc2626",
            }}
          >
            <strong>Reason:</strong> {reason}
          </Text>
          <Text>
            Please update your product listing and resubmit for review.
          </Text>
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: 12 }}>
            ETradeBazaar Seller Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
