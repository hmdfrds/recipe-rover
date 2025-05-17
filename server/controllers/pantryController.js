import pool from "../config/db.js";

// @desc    Add an ingredient to the user's pantry
// @route   POST /api/pantry
// @access  Private
const addPantryItem = async (req, res) => {
  const { ingredient_id, quantity, unit } = req.body;
  const user_id = req.user.user_id;

  if (!ingredient_id) {
    return res.status(400).json({ message: "Ingredient ID is required." });
  }

  try {
    const ingredientExists = await pool.query(
      "SELECT * FROM Ingredients WHERE ingredient_id = $1",
      [ingredient_id]
    );

    if (ingredientExists.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Ingredient not found in master list." });
    }

    const existingItem = await pool.query(
      "SELECT * FROM UserPantry WHERE user_id = $1 AND ingredient_id = $2",
      [user_id, ingredient_id]
    );

    if (existingItem.rows.length > 0) {
      return res.status(409).json({
        message:
          "Ingredient already in pantry. Use update to change quantity/unit.",
      });
    }

    const newItemQuery = `
    INSERT INTO UserPantry (user_id, ingredient_id, quantity, unit, added_at, updated_at) 
    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
    RETURNING user_pantry_id, ingredient_id, quantity, unit, added_at, updated_at;
    `;
    const { rows } = await pool.query(newItemQuery, [
      user_id,
      ingredient_id,
      quantity,
      unit,
    ]);

    return res
      .status(201)
      .json({ pantryItem: rows[0], message: "Ingredient added to pantry" });
  } catch (error) {
    console.error("Error adding pantry item:", error);

    if (
      error.code === "23505" &&
      error.constraint === "userpantry_user_id_ingredient_id_key"
    ) {
      return res.status(409).json({
        message:
          "Ingredient already in pantry. Use update to change quantity/unit.",
      });
    }

    if (error.code === "23503") {
      return res
        .status(400)
        .json({ message: "Invalid ingredient ID provided." });
    }

    return res
      .status(500)
      .json({ message: "Server error while adding item to pantry." });
  }
};

// @desc    Get all ingredients from the user's pantry
// @route   GET /api/pantry
// @access  Private
const getPantryItems = async (req, res) => {
  const user_id = req.user.user_id;
  try {
    const pantryItemsQuery = `
        SELECT up.user_pantry_id, up.ingredient_id, i.name as ingredient_name, i.category as ingredient_category, up.quantity, up.unit, up.added_at, up.updated_at 
        FROM UserPantry up 
        JOIN Ingredients i ON up.ingredient_id = i.ingredient_id 
        WHERE up.user_id = $1 
        ORDER BY i.name ASC;
        `;

    const { rows } = await pool.query(pantryItemsQuery, [user_id]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching pantry items:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching pantry items." });
  }
};

// @desc    Update an ingredient' quantity/unit in the pantry
// @route   PUT /api/pantry/:pantry_item_id
// @access  Private
const updatePantryItem = async (req, res) => {
  const { pantry_item_id } = req.params;
  const { quantity, unit } = req.body;
  const user_id = req.user.user_id;

  if (quantity === undefined && unit === undefined) {
    return res
      .status(400)
      .json({ message: "Nothing to update. Provide quantity or unit." });
  }

  try {
    let updateFields = [];
    let queryParams = [];
    let paramIndex = 1;

    if (quantity !== undefined) {
      updateFields.push(`quantity = $${paramIndex++}`);
      queryParams.push(quantity);
    }
    if (unit !== undefined) {
      updateFields.push(`unit = $${paramIndex++}`);
      queryParams.push(unit);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    queryParams.push(pantry_item_id);
    queryParams.push(user_id);

    const updateQuery = `
        UPDATE UserPantry 
        SET ${updateFields.join(", ")} 
        WHERE user_pantry_id = $${paramIndex++} AND user_id = $${paramIndex} 
        RETURNING user_pantry_id, ingredient_id, quantity, unit, added_at, updated_at;
        `;

    const { rows } = await pool.query(updateQuery, queryParams);

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Pantry item not found or user not authorized to update.",
      });
    }
    res.status(200).json({
      pantryItem: rows[0],
      message: "Pantry item updated successfully.",
    });
  } catch (error) {
    console.error("Error updating pantry item:", error);
    res
      .status(500)
      .json({ message: "Server error while updating pantry item." });
  }
};

// @desc    Remove an ingredient from the user's pantry
// @route   DELETE /api/pantry/:pantry_item_id
// @access  Private
const removePantryItem = async (req, res) => {
  const { pantry_item_id } = req.params;
  const user_id = req.user.user_id;

  try {
    const deleteQuery = `
    DELETE FROM UserPantry 
    WHERE user_pantry_id = $1 AND user_id = $2 
    RETURNING user_pantry_id;
    `;
    console.log(`Pantry Iten ${pantry_item_id}, user_id ${user_id}`);
    const { rows } = await pool.query(deleteQuery, [pantry_item_id, user_id]);
    if (rows.length === 0) {
      return res.status(404).json({
        message: "Pantry item not found or user not authorized to delete.",
      });
    }
    res.status(200).json({
      message: "Pantry item removed successfully.",
      user_pantry_id: rows[0].user_pantry_id,
    });
  } catch (error) {
    console.error("Error removing pantry item:", error);
    res
      .status(500)
      .json({ message: "Server error while removing pantry item." });
  }
};

export { addPantryItem, getPantryItems, updatePantryItem, removePantryItem };
