ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops FORCE ROW LEVEL SECURITY;

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

ALTER TABLE seller_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_members FORCE ROW LEVEL SECURITY;

ALTER TABLE seller_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_roles FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON shops
  USING (
    current_setting('app.is_platform_admin', true) = 'true'
    OR "sellerId" = current_setting('app.current_seller', true)
  );

CREATE POLICY tenant_isolation ON products
  USING (
    current_setting('app.is_platform_admin', true) = 'true'
    OR "sellerId" = current_setting('app.current_seller', true)
  );

CREATE POLICY tenant_isolation ON seller_members
  USING (
    current_setting('app.is_platform_admin', true) = 'true'
    OR "sellerId" = current_setting('app.current_seller', true)
  );

CREATE POLICY tenant_isolation ON seller_roles
  USING (
    current_setting('app.is_platform_admin', true) = 'true'
    OR "sellerId" = current_setting('app.current_seller', true)
  );