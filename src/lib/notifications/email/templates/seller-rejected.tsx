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
  businessName: string;
  reason: string;
}

export function SellerRejectedEmail({
  sellerName,
  businessName,
  reason,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Update on your seller application</Preview>
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
          <Heading style={{ color: "#dc2626" }}>Application Update</Heading>
          <Text>Hi {sellerName},</Text>
          <Text>
            Unfortunately, your seller application for{" "}
            <strong>{businessName}</strong> has not been approved at this time.
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
            If you believe this is an error or have addressed the issue, you may
            reapply or contact our support team.
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
