-- Create custom types for enums
create type product_category as enum ('School Uniform', 'PE Uniform', 'Other Items');
create type product_status as enum ('In Stock', 'Out of Stock', 'Limited Stock', 'Pre-Order Only');
create type grade_level as enum ('Pre-Kindergarten', 'Elementary', 'Junior High School', 'Senior High School', 'College');
create type gender_type as enum ('Male', 'Female', 'Unisex');

-- Create products table
create table products (
  id uuid primary key default uuid_generate_v4(),
  name varchar(255) not null,
  category product_category not null,
  sub_category varchar(255) not null,
  description text not null,
  price numeric(10,2) not null check (price >= 0),
  images jsonb not null default '[]'::jsonb,  -- Array of objects with url and alt text
  sizes jsonb not null default '[]'::jsonb,   -- Array of objects with name and stock
  status product_status not null default 'In Stock',
  order_limit integer,
  pre_order_available boolean default false,
  pre_order_start_date timestamptz,
  pre_order_end_date timestamptz,
  grade_level grade_level not null,
  gender gender_type not null default 'Unisex',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for better query performance
create index idx_products_category on products(category);
create index idx_products_sub_category on products(sub_category);
create index idx_products_grade_level on products(grade_level);
create index idx_products_status on products(status);
create index idx_products_is_active on products(is_active);

-- Full-text search indexes
create index idx_products_name_fts on products using gin(to_tsvector('english', name));
create index idx_products_description_fts on products using gin(to_tsvector('english', description));

-- Function to automatically update the updated_at timestamp
create or replace function update_updated_at_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to call the update function
create trigger set_timestamp
before update on products
for each row
execute function update_updated_at_timestamp();

-- Enable Row Level Security (RLS)
alter table products enable row level security;

-- RLS Policies
create policy "Enable read access for all users"
  on products for select
  using (is_active = true);

create policy "Enable all access for authenticated users with admin role"
  on products for all
  using (
    auth.role() = 'authenticated' 
    and auth.uid() in (
      select user_id from user_roles where role = 'admin'
    )
  );

-- Example validation function for sizes JSON
create or replace function validate_product_sizes()
returns trigger as $$
begin
  if not (
    new.sizes @> '[]'::jsonb 
    and jsonb_typeof(new.sizes) = 'array'
    and (
      select bool_and(
        value ? 'name' 
        and value ? 'stock' 
        and jsonb_typeof(value->'stock') = 'number'
        and (value->>'stock')::int >= 0
      )
      from jsonb_array_elements(new.sizes)
    )
  ) then
    raise exception 'Invalid sizes format. Must be an array of objects with name and stock >= 0';
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger for sizes validation
create trigger validate_sizes
before insert or update on products
for each row
execute function validate_product_sizes();