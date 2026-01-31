-- Enable the UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Create enum types
create type product_category as enum ('School Uniform', 'PE Uniform', 'Other Items');
create type product_status as enum ('In Stock', 'Out of Stock', 'Limited Stock', 'Pre-Order Only');
create type grade_level as enum ('Pre-Kindergarten', 'Elementary', 'Junior High School', 'Senior High School', 'College');
create type gender_type as enum ('Male', 'Female', 'Unisex');

-- Create the products table
create table products (
  id uuid primary key default uuid_generate_v4(),
  name varchar(255) not null,
  category product_category not null,
  sub_category varchar(255) not null,
  description text not null,
  price numeric(10,2) not null check (price >= 0),
  images jsonb not null default '[]',
  sizes jsonb not null default '[]',
  status product_status not null default 'In Stock',
  order_limit int,
  pre_order_available boolean default false,
  pre_order_start_date timestamp with time zone,
  pre_order_end_date timestamp with time zone,
  grade_level grade_level not null,
  gender gender_type not null default 'Unisex',
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes
create index products_category_idx on products(category);
create index products_sub_category_idx on products(sub_category);
create index products_grade_level_idx on products(grade_level);
create index products_status_idx on products(status);
create index products_name_search_idx on products using gin(to_tsvector('english', name));
create index products_description_search_idx on products using gin(to_tsvector('english', description));

-- Create an update trigger for updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_products_updated_at
  before update on products
  for each row
  execute function update_updated_at_column();

-- Create RLS policies
alter table products enable row level security;

-- Policy for reading active products (public)
create policy "Read active products"
  on products for select
  using (is_active = true);

-- Policy for property custodian and system admin operations (create, update, delete)
create policy "Property Custodian and System Admin full access"
  on products for all
  using (auth.role() = 'authenticated' and auth.uid() in (
    select user_id from staff where role IN ('property_custodian', 'system_admin') and status = 'active'
  ));