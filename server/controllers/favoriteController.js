import pool from "../config/db.js";

// @desc    Add a recipe to user's favorites
// @route   POST /api/favorites
// @access  Private
const addFavoriteRecipe = async (req, res) => {
  const { recipe_id } = req.body;
  const user_id = req.user.user_id;

  if (!recipe_id) {
    return res.status(400).json({ message: "Recipe ID is required." });
  }

  try {
    const recipeExists = await pool.query(
      "SELECT recipe_id FROM Recipes WHERE recipe_id = $1",
      [recipe_id]
    );
    if (recipeExists.rows.length === 0) {
      return res.status(404).json({ message: "Recipe not found." });
    }
    const alreadyFavorited = await pool.query(
      "SELECT favorite_id FROM FavoriteRecipes WHERE user_id = $1 AND recipe_id =$2",
      [user_id, recipe_id]
    );
    if (alreadyFavorited.rows.length > 0) {
      return res.status(409).json({ message: "Recipe alraedy in favorites." });
    }

    const newFavoriteQuery = `INSERT INTO FavoriteRecipes (user_id, recipe_id) VALUES ($1, $2) RETURNING favorite_id, recipe_id, favorited_at;`;
    const { rows } = await pool.query(newFavoriteQuery, [user_id, recipe_id]);
    res
      .status(201)
      .json({ favorite: rows[0], message: "Recipe added to favorites." });
  } catch (error) {
    console.error("Error adding favorite recipe:", error);
    if (error.code === "23503") {
      return res
        .status(404)
        .json({ message: "Recipe not found or invalid recipe ID." });
    }
    if (error.code === "23505") {
      return res.status(409).json({ message: "Recipe already in favorites." });
    }

    res
      .status(500)
      .json({ message: "Server error while adding to favorites." });
  }
};

// @desc    Remove a recipe from user's favorites
// @route   DELETE /api/favorites/:recipe_id
// @access  Private
const removeFavoriteRecipe = async (req, res) => {
  const { recipe_id } = req.params;
  const user_id = req.user.user_id;

  try {
    const deleteQuery = `DELETE FROM FavoriteREcipes WHERE user_id = $1 AND recipe_id = $2 RETURNING favorite_id;`;

    const result = await pool.query(deleteQuery, [user_id, recipe_id]);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: "Favorite reciep not found for this user." });
    }
    res.status(200).json({
      message: "Recipe removed from favorites.",
      recipe_id: recipe_id,
    });
  } catch (error) {
    console.error("Error removing favorite recipe:", error);
    res
      .status(500)
      .json({ message: "Server error while removing from favorites." });
  }
};

// @desc    Get all favorite recipes from the logged-in user
// @route   GET /api/favorites
// @access  Private
const getFavoriteRecipes = async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const favoritesQuery = `
        SELECT r.recipe_id, r.title, r.description, r.image_url, r.difficulty, r.prep_time_minutes, r.cook_time_minutes, fr.favorited_at 
        FROM FavoriteRecipes fr 
        JOIN Recipes r ON fr.recipe_id = r.recipe_id  
        WHERE fr.user_id = $1 
        ORDER BY fr.favorited_at DESC;
        `;
    const { rows } = await pool.query(favoritesQuery, [user_id]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching favorite recipes:", error);
    res.status(500).json({ message: "Server error while fetching favorites." });
  }
};

export { addFavoriteRecipe, removeFavoriteRecipe, getFavoriteRecipes };
