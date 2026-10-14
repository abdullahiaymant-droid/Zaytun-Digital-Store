-- Permissions helpers
CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role <> 'customer')
$$;

CREATE OR REPLACE FUNCTION public.has_perm(_uid uuid, _perm text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r WHERE r.user_id = _uid AND (
      r.role IN ('super_admin','admin')
      OR (r.role = 'manager' AND _perm IN ('orders','customers','products','inventory','coupons','reviews','analytics'))
      OR (r.role = 'product_manager' AND _perm IN ('products','inventory'))
      OR (r.role = 'order_manager' AND _perm IN ('orders','customers'))
      OR (r.role = 'support' AND _perm IN ('customers_read','orders_read','reviews'))
    ) AND NOT (_perm = 'staff' AND r.role = 'admin' AND false)
  ) OR (_perm = 'orders_read' AND public.has_perm(_uid,'orders'))
    OR (_perm = 'customers_read' AND public.has_perm(_uid,'customers'))
$$;

CREATE OR REPLACE FUNCTION public.my_perms() RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(p), '{}') FROM unnest(ARRAY['orders','orders_read','customers','customers_read','products','inventory','coupons','reviews','analytics','staff','audit']) p
  WHERE public.has_perm(auth.uid(), p)
$$;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid), public.has_perm(uuid,text), public.my_perms() TO authenticated;

-- Profiles: email + disabled
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id = p.id AND p.email IS NULL;

-- Existing admins become super admins
INSERT INTO public.user_roles (user_id, role) SELECT user_id, 'super_admin' FROM public.user_roles WHERE role = 'admin'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles x WHERE x.user_id = user_roles.user_id AND x.role = 'super_admin');
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_uniq ON public.user_roles(user_id, role);

-- Audit log
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid, actor_email text,
  action text NOT NULL, target text, meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'audit'));

CREATE OR REPLACE FUNCTION public.write_audit(_action text, _target text, _meta jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RETURN; END IF;
  INSERT INTO public.audit_logs(actor_id, actor_email, action, target, meta)
  VALUES (auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()), _action, _target, coalesce(_meta,'{}'));
END $$;
REVOKE EXECUTE ON FUNCTION public.write_audit(text,text,jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.write_audit(text,text,jsonb) TO authenticated;

-- Notifications (shared staff inbox)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL, title text NOT NULL, body text NOT NULL DEFAULT '', link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_created_idx ON public.notifications(created_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif read" ON public.notifications FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "notif update" ON public.notifications FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Order status history
CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  field text NOT NULL, old_value text, new_value text NOT NULL,
  changed_by uuid, changed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX osh_order_idx ON public.order_status_history(order_id, created_at);
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "osh read" ON public.order_status_history FOR SELECT TO authenticated USING (
  public.has_perm(auth.uid(),'orders_read') OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- Inventory transactions
CREATE TABLE public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  old_qty int NOT NULL, new_qty int NOT NULL, change int NOT NULL,
  reason text NOT NULL, actor_id uuid, actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inv_tx_created_idx ON public.inventory_transactions(created_at DESC);
GRANT SELECT ON public.inventory_transactions TO authenticated;
GRANT ALL ON public.inventory_transactions TO service_role;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv read" ON public.inventory_transactions FOR SELECT TO authenticated USING (public.has_perm(auth.uid(),'inventory'));

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS low_stock_threshold int NOT NULL DEFAULT 5;

-- Stock change tracking + low stock notifications
CREATE OR REPLACE FUNCTION public.on_product_stock_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _reason text := coalesce(current_setting('zdt.stock_reason', true), '');
BEGIN
  IF NEW.stock IS DISTINCT FROM OLD.stock THEN
    INSERT INTO public.inventory_transactions(product_id, product_name, old_qty, new_qty, change, reason, actor_id, actor_email)
    VALUES (NEW.id, NEW.name, OLD.stock, NEW.stock, NEW.stock - OLD.stock,
      CASE WHEN _reason <> '' THEN _reason WHEN NEW.stock < OLD.stock THEN 'Sale' ELSE 'Edited' END,
      auth.uid(), (SELECT email FROM public.profiles WHERE id = auth.uid()));
    IF NEW.stock = 0 AND OLD.stock > 0 THEN
      INSERT INTO public.notifications(kind,title,body,link) VALUES ('out_of_stock','Out of stock', NEW.name || ' is out of stock', '/admin/inventory');
    ELSIF NEW.stock <= NEW.low_stock_threshold AND OLD.stock > NEW.low_stock_threshold THEN
      INSERT INTO public.notifications(kind,title,body,link) VALUES ('low_stock','Low stock', NEW.name || ' has ' || NEW.stock || ' left', '/admin/inventory');
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_stock_change AFTER UPDATE OF stock ON public.products FOR EACH ROW EXECUTE FUNCTION public.on_product_stock_change();

-- Product / coupon audit
CREATE OR REPLACE FUNCTION public.audit_row() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    PERFORM public.write_audit(lower(TG_OP) || ' product', coalesce(NEW.name, OLD.name), '{}');
  ELSIF TG_TABLE_NAME = 'coupons' THEN
    PERFORM public.write_audit(lower(TG_OP) || ' coupon', coalesce(NEW.code, OLD.code), '{}');
  ELSIF TG_TABLE_NAME = 'categories' THEN
    PERFORM public.write_audit(lower(TG_OP) || ' category', coalesce(NEW.name, OLD.name), '{}');
  END IF;
  RETURN coalesce(NEW, OLD);
END $$;
CREATE TRIGGER products_audit AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER coupons_audit AFTER INSERT OR UPDATE OR DELETE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.audit_row();
CREATE TRIGGER categories_audit AFTER INSERT OR UPDATE OR DELETE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.audit_row();

-- Orders: block disabled customers, notify, history, restock on cancel
CREATE OR REPLACE FUNCTION public.on_order_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND disabled) THEN
    RAISE EXCEPTION 'This account is disabled. Please contact support.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_before_insert BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.on_order_insert();

CREATE OR REPLACE FUNCTION public.on_order_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.order_status_history(order_id, field, old_value, new_value, changed_by) VALUES (NEW.id, 'status', NULL, NEW.status, NEW.user_id);
  INSERT INTO public.notifications(kind,title,body,link) VALUES ('new_order','New order ' || NEW.reference, NEW.shipping_name || ' · ₦' || to_char(NEW.total,'FM999,999,999'), '/admin/orders/' || NEW.id);
  RETURN NEW;
END $$;
CREATE TRIGGER orders_after_insert AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.on_order_created();

CREATE OR REPLACE FUNCTION public.on_order_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text := (SELECT email FROM public.profiles WHERE id = auth.uid()); _it record;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history(order_id, field, old_value, new_value, changed_by, changed_by_email) VALUES (NEW.id,'status',OLD.status,NEW.status,auth.uid(),_email);
    PERFORM public.write_audit('order status changed', NEW.reference, jsonb_build_object('from',OLD.status,'to',NEW.status));
    IF NEW.status IN ('cancelled','returned','refunded') AND OLD.status NOT IN ('cancelled','returned','refunded') THEN
      PERFORM set_config('zdt.stock_reason', 'Restocked: order ' || NEW.reference || ' ' || NEW.status, true);
      FOR _it IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL LOOP
        UPDATE public.products SET stock = stock + _it.quantity WHERE id = _it.product_id;
      END LOOP;
      PERFORM set_config('zdt.stock_reason', '', true);
    ELSIF OLD.status IN ('cancelled','returned','refunded') AND NEW.status NOT IN ('cancelled','returned','refunded') THEN
      RAISE EXCEPTION 'A cancelled, returned or refunded order cannot be reopened';
    END IF;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    INSERT INTO public.order_status_history(order_id, field, old_value, new_value, changed_by, changed_by_email) VALUES (NEW.id,'payment',OLD.payment_status,NEW.payment_status,auth.uid(),_email);
    PERFORM public.write_audit('payment status changed', NEW.reference, jsonb_build_object('from',OLD.payment_status,'to',NEW.payment_status));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER orders_after_update AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.on_order_update();

-- New users
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email) VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'customer');
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role IN ('admin','super_admin')) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'admin'), (new.id, 'super_admin');
  END IF;
  INSERT INTO public.notifications(kind,title,body,link) VALUES ('new_customer','New customer', coalesce(new.raw_user_meta_data->>'full_name', new.email) || ' signed up', '/admin/customers/' || new.id);
  RETURN new;
END $$;

-- Tighten policies to permissions
DROP POLICY IF EXISTS "prod admin" ON public.products;
CREATE POLICY "prod staff" ON public.products FOR ALL TO authenticated USING (public.has_perm(auth.uid(),'products')) WITH CHECK (public.has_perm(auth.uid(),'products'));
DROP POLICY IF EXISTS "prod read" ON public.products;
CREATE POLICY "prod read" ON public.products FOR SELECT TO anon, authenticated USING (active OR public.is_staff(auth.uid()));
DROP POLICY IF EXISTS "cat admin" ON public.categories;
CREATE POLICY "cat staff" ON public.categories FOR ALL TO authenticated USING (public.has_perm(auth.uid(),'products')) WITH CHECK (public.has_perm(auth.uid(),'products'));
DROP POLICY IF EXISTS "coupon admin" ON public.coupons;
CREATE POLICY "coupon staff" ON public.coupons FOR ALL TO authenticated USING (public.has_perm(auth.uid(),'coupons')) WITH CHECK (public.has_perm(auth.uid(),'coupons'));
DROP POLICY IF EXISTS "order admin update" ON public.orders;
CREATE POLICY "order staff update" ON public.orders FOR UPDATE TO authenticated USING (public.has_perm(auth.uid(),'orders')) WITH CHECK (public.has_perm(auth.uid(),'orders'));
DROP POLICY IF EXISTS "order read" ON public.orders;
CREATE POLICY "order read" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_perm(auth.uid(),'orders_read'));
DROP POLICY IF EXISTS "items read" ON public.order_items;
CREATE POLICY "items read" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.has_perm(auth.uid(),'orders_read'))));
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_perm(auth.uid(),'customers_read'));
DROP POLICY IF EXISTS "rev delete" ON public.reviews;
CREATE POLICY "rev delete" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_perm(auth.uid(),'reviews'));
DROP POLICY IF EXISTS "own roles" ON public.user_roles;
CREATE POLICY "own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_perm(auth.uid(),'staff'));

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_customers() RETURNS TABLE (
  id uuid, full_name text, email text, phone text, created_at timestamptz, disabled boolean,
  order_count bigint, total_spent numeric, last_order timestamptz, roles text[], last_sign_in timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm(auth.uid(),'customers_read') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, coalesce(p.email, u.email)::text, p.phone, p.created_at, p.disabled,
    (SELECT count(*) FROM public.orders o WHERE o.user_id = p.id),
    (SELECT coalesce(sum(o.total),0) FROM public.orders o WHERE o.user_id = p.id AND o.status NOT IN ('cancelled','returned','refunded')),
    (SELECT max(o.created_at) FROM public.orders o WHERE o.user_id = p.id),
    (SELECT array_agg(r.role::text) FROM public.user_roles r WHERE r.user_id = p.id),
    u.last_sign_in_at
  FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_customer_disabled(_uid uuid, _disabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm(auth.uid(),'customers') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _uid = auth.uid() THEN RAISE EXCEPTION 'You cannot disable your own account'; END IF;
  IF public.is_staff(_uid) AND NOT public.has_perm(auth.uid(),'staff') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  UPDATE public.profiles SET disabled = _disabled WHERE id = _uid;
  UPDATE auth.users SET banned_until = CASE WHEN _disabled THEN 'infinity'::timestamptz ELSE NULL END WHERE id = _uid;
  PERFORM public.write_audit(CASE WHEN _disabled THEN 'customer disabled' ELSE 'customer enabled' END,
    (SELECT coalesce(email, id::text) FROM public.profiles WHERE id = _uid), '{}');
END $$;

CREATE OR REPLACE FUNCTION public.admin_adjust_stock(_product uuid, _new_qty int, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _name text;
BEGIN
  IF NOT public.has_perm(auth.uid(),'inventory') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _new_qty < 0 THEN RAISE EXCEPTION 'Stock cannot be negative'; END IF;
  IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
  PERFORM set_config('zdt.stock_reason', _reason, true);
  UPDATE public.products SET stock = _new_qty WHERE id = _product RETURNING name INTO _name;
  PERFORM set_config('zdt.stock_reason', '', true);
  PERFORM public.write_audit('stock changed', _name, jsonb_build_object('new_qty',_new_qty,'reason',_reason));
END $$;

CREATE OR REPLACE FUNCTION public.admin_staff() RETURNS TABLE (user_id uuid, full_name text, email text, roles text[]) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm(auth.uid(),'staff') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN QUERY SELECT p.id, p.full_name, p.email, array_agg(r.role::text)
  FROM public.user_roles r JOIN public.profiles p ON p.id = r.user_id
  WHERE r.role <> 'customer' GROUP BY p.id, p.full_name, p.email ORDER BY p.email;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_role(_email text, _role public.app_role, _grant boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_perm(auth.uid(),'staff') THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF _role = 'customer' THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF _role = 'super_admin' AND NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'Only a Super Admin can manage Super Admins'; END IF;
  SELECT id INTO _uid FROM public.profiles WHERE lower(email) = lower(trim(_email));
  IF _uid IS NULL THEN RAISE EXCEPTION 'No account found with that email. Ask them to sign up first.'; END IF;
  IF _uid = auth.uid() AND NOT _grant THEN RAISE EXCEPTION 'You cannot remove your own roles'; END IF;
  IF _grant THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (_uid, _role) ON CONFLICT DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _uid AND role = _role;
  END IF;
  PERFORM public.write_audit(CASE WHEN _grant THEN 'role granted' ELSE 'role removed' END, _email, jsonb_build_object('role',_role));
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_customers(), public.admin_set_customer_disabled(uuid,boolean), public.admin_adjust_stock(uuid,int,text), public.admin_staff(), public.admin_set_role(text,public.app_role,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_customers(), public.admin_set_customer_disabled(uuid,boolean), public.admin_adjust_stock(uuid,int,text), public.admin_staff(), public.admin_set_role(text,public.app_role,boolean) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications, public.orders, public.profiles;