import pool from "../config/db.js";

// @desc    Create a new recipe
// @route   POST /api/recipes
// @access  Private (requires login, e.g., admin or future user submissions)
const createRecipe = async (req, res) => {
  const {
    title,
    description,
    instructions,
    prep_time_minutes,
    cook_time_minutes,
    difficulty,
    servings,
    image_url,
    ingredients,
    tags,
  } = req.body;

  const user_id = req.user.user_id;

  if (!title || !instructions || !ingredients || ingredients.length === 0) {
    return res.status(400).json({
      message: "Title, instructions, and at least one ingredient are required.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const recipeQuery = `
    INSERT INTO Recipes (title, description, instructions, prep_time_minutes, cook_time_minutes, difficulty, servings, image_url, user_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
    RETURNING recipe_id, title, created_at;
    `;

    const recipeResult = await client.query(recipeQuery, [
      title,
      description,
      instructions,
      prep_time_minutes,
      cook_time_minutes,
      difficulty,
      servings,
      image_url,
      user_id,
    ]);

    const newRecipe = recipeResult.rows[0];
    const recipe_id = newRecipe.recipe_id;

    if (ingredients && ingredients.length > 0) {
      for (const ing of ingredients) {
        let ingredient_id = ing.ingredient_id;
        if (!ingredient_id && ing.name) {
          let existingIngredient = await client.query(
            "SELECT ingredient_id FROM Ingredients WHERE name ILIKE $1",
            [ing.name.trim()]
          );
          if (existingIngredient.rows.length > 0) {
            ingredient_id = existingIngredient.rows[0].ingredient_id;
          } else {
            const newIngQuery =
              "INSERT INTO Ingredients (name, category) VALUES ($1, $2) RETURNING ingredient_id";
            const newIngResult = await client.query(newIngQuery, [
              ing.name.trim(),
              ing.category || null,
            ]);
            ingredient_id = newIngResult.rows[0].ingredient_id;
          }
        }

        if (!ingredient_id) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: `Invalid data for ingredient: ${JSON.stringify(
              ing
            )}. Name or ID required.`,
          });
        }

        const recipeIngQuery = `
        INSERT INTO RecipeIngredients (recipe_id, ingredient_id, quantity, unit) 
        VALUES ($1, $2, $3, $4); 
        `;
        await client.query(recipeIngQuery, [
          recipe_id,
          ingredient_id,
          ing.quantity,
          ing.unit,
        ]);
      }
    }

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        let tag_id = tag.tag_id;
        if (!tag_id && tag.name && tag.type) {
          let existingTag = await client.query(
            "SELECT tag_id FROM RecipeTags WHERE name ILIKE $1 AND type ILIKE $2",
            [tag.name.trim(), tag.type.trim()]
          );
          if (existingTag.rows.length > 0) {
            tag_id = existingTag.rows[0].tag_id;
          } else {
            const newTagQuery =
              "INSERT INTO RecipeTags (name, type) VALUES ($1, $2) RETURNING tag_id";
            const newTagReuslt = await client.query(newTagQuery, [
              tag.name.trim(),
              tag.type.trim(),
            ]);
            tag_id = newTagReuslt.rows[0].tag_id;
          }
        }

        if (!tag_id) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: `Invalid data for tag: ${JSON.stringify(
              tag
            )}. Name/Type or ID required.`,
          });
        }

        console.log(`${recipe_id}, ${tag_id}`);
        const recipeTagMapQuery =
          "INSERT INTO RecipeTagMap (recipe_id, tag_id) VALUES ($1, $2)";
        await client.query(recipeTagMapQuery, [recipe_id, tag_id]);
      }
    }

    await client.query("COMMIT");
    res
      .status(201)
      .json({ recipe: newRecipe, message: "Recipe created successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating recipe:", error);
    res.status(500).json({ message: "Server error while creating recipe." });
  } finally {
    client.release();
  }
};

// @desc    Get all recipes (summary view)
// @route   GET /api/recipes
// @access  Public
const getRecipes = async (req, res) => {
  try {
    const query = `
        SELECT r.recipe_id, r.title, r.description, r.difficulty, r.prep_time_minutes, r.cook_time_minutes, r.servings, r.image_url, u.username as author_username, r.created_at, r.updated_at 
        FROM Recipes r 
        LEFT JOIN Users u ON r.user_id = u.user_id 
        ORDER BY r.created_at DESC;
        `;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching recipes:", error);
    res.status(500).json({ message: "Server error while fetching recipes." });
  }
};

// @desc    Get a single reicpe by ID (detailed view)
// @route   GET /api/recipes/:id
// @access  Public
const getRecipeById = async (req, res) => {
  const { id } = req.params;
  try {
    const recipeQuery = `
        SELECT r.*, u.username as author_username 
        FROM Recipes r 
        LEFT JOIN Users u ON r.user_id = u.user_id 
        WHERE r.recipe_id = $1;
        `;
    const recipeResult = await pool.query(recipeQuery, [id]);

    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ message: "Recipe not found." });
    }
    const recipe = recipeResult.rows[0];
    const ingredientsQuery = `
    SELECT i.ingredient_id, i.name, i.category, ri.quantity, ri.unit 
    FROM RecipeIngredients ri 
    JOIN Ingredients i on ri.ingredient_id = i.ingredient_id 
    WHERE ri.recipe_id = $1;
    `;
    const ingredientsResult = await pool.query(ingredientsQuery, [id]);
    recipe.ingredients = ingredientsResult.rows;

    const tagsQuery = `
    SELECT t.tag_id, t.name, t.type 
    FROM RecipeTagMap rtm 
    JOIN RecipeTags t ON rtm.tag_id = t.tag_id 
    WHERE rtm.recipe_id = $1;
    `;
    const tagsResult = await pool.query(tagsQuery, [id]);
    recipe.tags = tagsResult.rows;

    res.status(200).json(recipe);
  } catch (error) {
    console.error(`Error fetching recipe ${id}:`, error);
    res
      .status(500)
      .json({ message: "Server error while fetching recipe details." });
  }
};

export { createRecipe, getRecipes, getRecipeById };
