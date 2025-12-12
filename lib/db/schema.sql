-- Recipe Book Database Schema
-- Run this in your Supabase SQL Editor

-- =====================
-- Better Auth Tables
-- =====================
-- These are created automatically by Better Auth on first run,
-- but we define them here for reference

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  id_token TEXT,
  password TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- Application Tables
-- =====================

-- User profiles (extends Better Auth user)
CREATE TABLE IF NOT EXISTS profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  bio TEXT,
  website TEXT,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories for organizing recipes
CREATE TABLE IF NOT EXISTS category (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags for flexible categorization
CREATE TABLE IF NOT EXISTS tag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Main recipes table
CREATE TABLE IF NOT EXISTS recipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  servings INTEGER,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  image_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  share_token TEXT UNIQUE,
  category_id UUID REFERENCES category(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Recipe-tag junction table
CREATE TABLE IF NOT EXISTS recipe_tag (
  recipe_id UUID NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

-- User favorites
CREATE TABLE IF NOT EXISTS favorite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, recipe_id)
);

-- =====================
-- Indexes
-- =====================

CREATE INDEX IF NOT EXISTS idx_recipe_user_id ON recipe(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_category_id ON recipe(category_id);
CREATE INDEX IF NOT EXISTS idx_recipe_is_public ON recipe(is_public);
CREATE INDEX IF NOT EXISTS idx_recipe_share_token ON recipe(share_token);
CREATE INDEX IF NOT EXISTS idx_recipe_created_at ON recipe(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorite_user_id ON favorite(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tag_recipe_id ON recipe_tag(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_tag_tag_id ON recipe_tag(tag_id);

-- Full-text search
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_recipe_search ON recipe USING GIN(search_vector);

-- =====================
-- Seed Default Categories
-- =====================

INSERT INTO category (name, slug, description) VALUES
  ('Breakfast', 'breakfast', 'Start your day right with these morning recipes'),
  ('Lunch', 'lunch', 'Midday meals to keep you going'),
  ('Dinner', 'dinner', 'Evening meals for the whole family'),
  ('Appetizers', 'appetizers', 'Small bites and starters'),
  ('Soups & Salads', 'soups-salads', 'Light and refreshing options'),
  ('Main Courses', 'main-courses', 'Hearty main dishes'),
  ('Side Dishes', 'side-dishes', 'Perfect accompaniments'),
  ('Desserts', 'desserts', 'Sweet treats and indulgences'),
  ('Snacks', 'snacks', 'Quick bites between meals'),
  ('Beverages', 'beverages', 'Drinks and refreshments'),
  ('Baking', 'baking', 'Breads, pastries, and baked goods')
ON CONFLICT (slug) DO NOTHING;
