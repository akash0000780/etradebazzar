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
  customerName: string;
  orderId: string;
  status: string;
  trackingId?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BOOKED: { label: "Shipment Booked", color: "#1d4ed8" },
  IN_TRANSIT: { label: "In Transit", color: "#d97706" },
  OUT_FOR_DELIVERY: { label: "Out for Delivery", color: "#7c3aed" },
  DELIVERED: { label: "Delivered", color: "#16a34a" },
  FAILED: { label: "Delivery Failed", color: "#dc2626" },
  RETURNED: { label: "Returned", color: "#6b7280" },
};

export function ShipmentUpdatedEmail({
  customerName,
  orderId,
  status,
  trackingId,
  trackingUrl,
  estimatedDelivery,
}: Props) {
  const { label, color } = STATUS_LABELS[status] ?? {
    label: status,
    color: "#374151",
  };

  return (
    <Html>
      <Head />
      <Preview>Shipment update for order #{orderId}</Preview>
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
          <Heading style={{ color }}>📦 {label}</Heading>
          <Text>Hi {customerName},</Text>
          <Text>
            Your shipment for order <strong>#{orderId}</strong> has been
            updated.
          </Text>

          {trackingId && (
            <Text>
              Tracking ID: <strong>{trackingId}</strong>
            </Text>
          )}
          {estimatedDelivery && (
            <Text>
              Estimated Delivery: <strong>{estimatedDelivery}</strong>
            </Text>
          )}
          {trackingUrl && (
            <Button
              href={trackingUrl}
              style={{
                background: color,
                color: "#fff",
                padding: "12px 24px",
                borderRadius: 6,
                textDecoration: "none",
              }}
            >
              Track Shipment
            </Button>
          )}
          <Hr />
          <Text style={{ color: "#6b7280", fontSize: 12 }}>ETradeBazaar</Text>
        </Container>
      </Body>
    </Html>
  );
}
