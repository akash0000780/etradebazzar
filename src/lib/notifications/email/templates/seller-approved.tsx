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
  businessName: string;
  loginUrl: string;
}

export function SellerApprovedEmail({
  sellerName,
  businessName,
  loginUrl,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>Your seller account has been approved</Preview>
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
          <Heading style={{ color: "#16a34a" }}>You're approved! 🎉</Heading>
          <Text>Hi {sellerName},</Text>
          <Text>
            Your seller account for <strong>{businessName}</strong> has been
            approved on ETradeBazaar. You can now create shops, list products,
            and start receiving orders.
          </Text>
          <Button
            href={loginUrl}
            style={{
              background: "#16a34a",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: 6,
              textDecoration: "none",
            }}
          >
            Go to Dashboard
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
