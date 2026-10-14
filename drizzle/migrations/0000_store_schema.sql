
create type public.app_role as enum ('admin','customer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  insert into public.user_roles (user_id, role) values (new.id, 'customer');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique, sort int not null default 0
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "cat read" on public.categories for select to anon, authenticated using (true);
create policy "cat admin" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null, slug text not null unique,
  description text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  brand text not null default '', sku text not null default '',
  price numeric(12,2) not null check (price >= 0),
  discount_price numeric(12,2),
  stock int not null default 0 check (stock >= 0),
  images text[] not null default '{}',
  colors text[] not null default '{}',
  specs jsonb not null default '{}',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "prod read" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "prod admin" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.coupons (
  code text primary key, percent_off int not null check (percent_off between 1 and 90),
  min_order numeric(12,2) not null default 0, active boolean not null default true
);
grant select, insert, update, delete on public.coupons to authenticated;
grant all on public.coupons to service_role;
alter table public.coupons enable row level security;
create policy "coupon admin" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('ZDT-' || upper(substr(md5(random()::text),1,8))),
  user_id uuid not null,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  payment_method text not null,
  subtotal numeric(12,2) not null, discount numeric(12,2) not null default 0,
  shipping numeric(12,2) not null, total numeric(12,2) not null,
  coupon_code text,
  shipping_name text not null, phone text not null, address text not null, city text not null, state text not null,
  notes text,
  created_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "order read" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "order admin update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid, name text not null, image text, price numeric(12,2) not null, quantity int not null, color text
);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "items read" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.has_role(auth.uid(),'admin'))));

create table public.wishlist (
  user_id uuid not null, product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, product_id)
);
grant select, insert, delete on public.wishlist to authenticated;
grant all on public.wishlist to service_role;
alter table public.wishlist enable row level security;
create policy "wish own" on public.wishlist for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null, author_name text not null,
  rating int not null check (rating between 1 and 5), comment text not null default '',
  created_at timestamptz not null default now(), unique (product_id, user_id)
);
grant select on public.reviews to anon, authenticated;
grant insert, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "rev read" on public.reviews for select to anon, authenticated using (true);
create policy "rev insert" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy "rev delete" on public.reviews for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.check_coupon(_code text)
returns table (code text, percent_off int, min_order numeric) language sql stable security definer set search_path = public as $$
  select c.code, c.percent_off, c.min_order from public.coupons c where upper(c.code) = upper(_code) and c.active
$$;
grant execute on function public.check_coupon(text) to authenticated, anon;

create or replace function public.place_order(_items jsonb, _ship jsonb, _coupon text, _payment_method text)
returns table (order_id uuid, order_reference text)
language plpgsql security definer set search_path = public as $$
declare
  _uid uuid := auth.uid();
  _it jsonb; _p public.products%rowtype; _qty int; _unit numeric;
  _subtotal numeric := 0; _discount numeric := 0; _shipping numeric; _pct int; _min numeric;
  _oid uuid; _ref text;
begin
  if _uid is null then raise exception 'Not signed in'; end if;
  if _payment_method not in ('cod','bank_transfer') then raise exception 'Invalid payment method'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Cart is empty'; end if;
  if coalesce(_ship->>'name','') = '' or coalesce(_ship->>'phone','') = '' or coalesce(_ship->>'address','') = '' or coalesce(_ship->>'city','') = '' or coalesce(_ship->>'state','') = '' then
    raise exception 'Shipping details incomplete'; end if;

  for _it in select * from jsonb_array_elements(_items) loop
    _qty := (_it->>'quantity')::int;
    if _qty < 1 or _qty > 20 then raise exception 'Invalid quantity'; end if;
    select * into _p from public.products where id = (_it->>'product_id')::uuid and active for update;
    if not found then raise exception 'Product unavailable'; end if;
    if _p.stock < _qty then raise exception '% has only % left in stock', _p.name, _p.stock; end if;
    _subtotal := _subtotal + coalesce(_p.discount_price, _p.price) * _qty;
  end loop;

  if coalesce(_coupon,'') <> '' then
    select percent_off, min_order into _pct, _min from public.coupons where upper(code) = upper(_coupon) and active;
    if _pct is null then raise exception 'Invalid coupon'; end if;
    if _subtotal < _min then raise exception 'Coupon needs a minimum order of %', _min; end if;
    _discount := round(_subtotal * _pct / 100.0, 2);
  end if;

  _shipping := case when _subtotal - _discount >= 500000 then 0 when lower(_ship->>'state') = 'lagos' then 2500 else 5000 end;

  insert into public.orders (user_id, payment_method, subtotal, discount, shipping, total, coupon_code, shipping_name, phone, address, city, state, notes)
  values (_uid, _payment_method, _subtotal, _discount, _shipping, _subtotal - _discount + _shipping, nullif(upper(_coupon),''),
    _ship->>'name', _ship->>'phone', _ship->>'address', _ship->>'city', _ship->>'state', _ship->>'notes')
  returning id, reference into _oid, _ref;

  for _it in select * from jsonb_array_elements(_items) loop
    _qty := (_it->>'quantity')::int;
    update public.products set stock = stock - _qty where id = (_it->>'product_id')::uuid returning * into _p;
    insert into public.order_items (order_id, product_id, name, image, price, quantity, color)
    values (_oid, _p.id, _p.name, _p.images[1], coalesce(_p.discount_price,_p.price), _qty, _it->>'color');
  end loop;

  return query select _oid, _ref;
end $$;
revoke execute on function public.place_order(jsonb,jsonb,text,text) from anon, public;
grant execute on function public.place_order(jsonb,jsonb,text,text) to authenticated;

insert into public.categories (name, slug, sort) values
 ('Smartphones','smartphones',1),('Laptops','laptops',2),('Tablets','tablets',3),('Audio','audio',4),
 ('Smart Watches','smart-watches',5),('Gaming','gaming',6),('Networking','networking',7),('Accessories','accessories',8);

insert into public.products (name, slug, description, category_id, brand, sku, price, discount_price, stock, images, colors, specs, featured) values
 ('Galaxy Nova X1 Pro 256GB','galaxy-nova-x1-pro','Flagship 6.7" AMOLED display, triple 200MP camera system and all-day 5000mAh battery. Official warranty.',(select id from categories where slug='smartphones'),'Samsung','ZDT-SP-001',1250000,1149000,14,'{/images/phone.jpg}','{Titanium Black,Silver}','{"Display":"6.7\" AMOLED 120Hz","Storage":"256GB","RAM":"12GB","Battery":"5000mAh","Network":"5G"}',true),
 ('iPhone 16 Pro 128GB','iphone-16-pro','Apple A18 Pro chip, ProMotion display and pro camera system. UK used grade A and brand new available.',(select id from categories where slug='smartphones'),'Apple','ZDT-SP-002',1850000,null,8,'{/images/phone.jpg}','{Black Titanium,Natural}','{"Display":"6.3\" Super Retina XDR","Storage":"128GB","Chip":"A18 Pro"}',true),
 ('Tecno Camon 30 5G','tecno-camon-30','Great value 5G phone with 50MP selfie camera and 70W fast charging.',(select id from categories where slug='smartphones'),'Tecno','ZDT-SP-003',389000,349000,30,'{/images/phone.jpg}','{Black,Green}','{"Display":"6.78\" AMOLED","Storage":"256GB","RAM":"8GB"}',false),
 ('AirBook 14 M3 Laptop','airbook-14-m3','Ultra-thin 14" laptop with 18-hour battery, 16GB unified memory and 512GB SSD.',(select id from categories where slug='laptops'),'Apple','ZDT-LP-001',2100000,1990000,6,'{/images/laptop.jpg}','{Silver,Space Grey}','{"Display":"14\" Liquid Retina","RAM":"16GB","Storage":"512GB SSD","Battery":"18 hours"}',true),
 ('HP EliteBook 840 G9','hp-elitebook-840','Business laptop with Intel Core i7, 16GB RAM and backlit keyboard.',(select id from categories where slug='laptops'),'HP','ZDT-LP-002',1450000,null,10,'{/images/laptop.jpg}','{Silver}','{"CPU":"Intel Core i7 12th Gen","RAM":"16GB","Storage":"512GB SSD"}',false),
 ('Tab S9 11" WiFi + Pen','tab-s9','11-inch tablet with included stylus, perfect for school and creative work.',(select id from categories where slug='tablets'),'Samsung','ZDT-TB-001',780000,720000,12,'{/images/tablet.jpg}','{Graphite,Beige}','{"Display":"11\" 120Hz","Storage":"128GB","Stylus":"Included"}',true),
 ('Pods Pro 2 Wireless Earbuds','pods-pro-2','Active noise cancellation, transparency mode and wireless charging case.',(select id from categories where slug='audio'),'Apple','ZDT-AU-001',285000,259000,40,'{/images/earbuds.jpg}','{White}','{"ANC":"Yes","Battery":"6h (30h with case)","Charging":"USB-C / Wireless"}',true),
 ('Studio ANC Over-Ear Headphones','studio-anc-headphones','Premium over-ear headphones with 40-hour battery and deep bass.',(select id from categories where slug='audio'),'Sony','ZDT-AU-002',420000,null,15,'{/images/headphones.jpg}','{Black,Silver}','{"ANC":"Yes","Battery":"40 hours","Bluetooth":"5.3"}',false),
 ('Watch Series 9 45mm','watch-series-9','Health tracking, always-on display and fast charging smart watch.',(select id from categories where slug='smart-watches'),'Apple','ZDT-SW-001',560000,525000,9,'{/images/watch.jpg}','{Midnight,Starlight}','{"Size":"45mm","Water resistance":"50m","GPS":"Yes"}',true),
 ('DualPro Wireless Controller','dualpro-controller','Responsive wireless controller with haptic feedback for PS5 and PC.',(select id from categories where slug='gaming'),'Sony','ZDT-GM-001',98000,89000,25,'{/images/controller.jpg}','{Midnight Black,White}','{"Connectivity":"Bluetooth / USB-C","Battery":"12 hours"}',false),
 ('AX3000 Dual-Band WiFi 6 Router','ax3000-router','Fast WiFi 6 router covering homes and small offices, MU-MIMO with 4 antennas.',(select id from categories where slug='networking'),'TP-Link','ZDT-NW-001',115000,null,20,'{/images/router.jpg}','{Black}','{"Standard":"WiFi 6","Speed":"3000Mbps","Antennas":"4"}',false),
 ('Fast Charge 65W GaN Charger','gan-65w-charger','Compact 3-port GaN charger for laptops, phones and tablets.',(select id from categories where slug='accessories'),'Anker','ZDT-AC-001',38000,32000,60,'{/images/earbuds.jpg}','{White}','{"Output":"65W","Ports":"2x USB-C, 1x USB-A"}',false);

insert into public.coupons (code, percent_off, min_order) values ('WELCOME10', 10, 50000);
