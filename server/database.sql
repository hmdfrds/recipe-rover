-- Users Table
CREATE TABLE IF NOT EXISTS Users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ingredients Table
CREATE TABLE IF NOT EXISTS Ingredients (
    ingredient_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50)
);

-- Recipes Table
CREATE TABLE IF NOT EXISTS Recipes (
    recipe_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT NOT NULL,
    prep_time_minutes INTEGER,
    cook_time_minutes INTEGER, -- Store duration in minutes
    difficulty VARCHAR(20) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    servings INTEGER,
    image_url VARCHAR(2048),
    user_id INTEGER REFERENCES Users(user_id) ON DELETE SET NULL, -- For user-submitted recipes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RecipeIngredients
CREATE TABLE IF NOT EXISTS RecipeIngredients (
    recipe_ingredient_id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES Recipes(recipe_id) ON DELETE CASCADE NOT NULL,
    ingredient_id INTEGER REFERENCES Ingredients(ingredient_id) ON DELETE RESTRICT NOT NULL,
    quantity VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    UNIQUE (recipe_id, ingredient_id)
);

-- UserPantry Table
CREATE TABLE IF NOT EXISTS UserPantry (
    user_pantry_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE CASCADE NOT NULL,
    ingredient_id INTEGER REFERENCES Ingredients(ingredient_id) ON DELETE CASCADE NOT NULL,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, ingredient_id)
);

-- FavoriteRecipes Table
CREATE TABLE IF NOT EXISTS FavoriteRecipes (
    favorite_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE CASCADE NOT NULL,
    recipe_id INTEGER REFERENCES Recipes(recipe_id) ON DELETE CASCADE NOT NULL,
    favorited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, recipe_id)
);

-- RecipeRatings Table
CREATE TABLE IF NOT EXISTS RecipeRatings (
    rating_id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES Recipes(recipe_id) ON DELETE CASCADE NOT NULL,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE CASCADE NOT NULL,
    rating_value INTEGER CHECK (rating_value BETWEEN 1 AND 5) NOT NULL,
    comment TEXT,
    rated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (recipe_id, user_id)
);

-- RecipeTags
CREATE TABLE IF NOT EXISTS RecipeTags (
    tag_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL
);

-- RecipeTagMap
CREATE TABLE IF NOT EXISTS RecipeTagMap (
    map_id SERIAL PRIMARY KEY,
    recipe_id INTEGER REFERENCES Recipes(recipe_id) ON DELETE CASCADE NOT NULL,
    tag_id INTEGER REFERENCES RecipeTags(tag_id) ON DELETE CASCADE NOT NULL,
    UNIQUE (recipe_id, tag_id)
);

-- Trigger to update 'updated_at' timestamp on Recipes table
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_recipe_updated_at
BEFORE UPDATE ON Recipes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Initial data example:
-- INSERT INTO Ingredients (name, category) VALUES ('Chicken Breast', 'Meat');
-- INSERT INTO Ingredients (name, category) VALUES ('Onion', 'Vegetable');
-- INSERT INTO RecipeTags (name, type) VALUES ('Italian', 'cuisine');
-- INSERT INTO RecipeTags (name, type) VALUES ('Vegetarian', 'dietary');

\echo 'Database schema created successfully (if tables did not already exist).'