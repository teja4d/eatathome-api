const Cart = require('../models/Cart');
const mongoose = require('mongoose');

exports.addToCart = async (req, res) => {
  const { userId, itemId, qty } = req.body;

  try {
    //if the user already has the item in the cart, update the quantity
    const existingCartItem = await Cart.findOne({
      userId,
      itemId,
      ordered: false,
    });

    if (existingCartItem) {
      const updatedQty = existingCartItem.qty + qty;
      const updatedCartItem = await Cart.findOneAndUpdate(
        { userId, itemId, ordered: false },
        { qty: updatedQty },
        { new: true }
      );

      return res.status(200).json({
        cartId: updatedCartItem._id,
        message: 'Cart item updated',
      });
    }
    // Create a new cart item
    const cartItem = new Cart({
      userId,
      itemId,
      qty,
      // ordered is false by default as defined in the model
    });

    // Save the cart item to the database
    const result = await cartItem.save();

    // Respond with the cart item ID and success message
    res.status(201).json({ cartId: result._id, message: 'Item added to cart' });
  } catch (error) {
    // Handle errors, like missing fields or invalid IDs
    res.status(500).json({ message: 'Error adding to cart' });
  }
};

exports.showCart = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.params.userId); // Correctly instantiate ObjectId

  try {
    const cartItems = await Cart.aggregate([
      { $match: { userId: userId, ordered: false } }, // Match user's cart items that haven't been ordered
      {
        $lookup: {
          from: 'items', // The collection to join
          localField: 'itemId', // Field from the Cart collection
          foreignField: '_id', // Field from the Items collection
          as: 'itemDetails', // Array of matching items
        },
      },
      { $unwind: '$itemDetails' }, // Deconstructs the array field from the joined documents
      {
        $project: {
          userId: 1,
          itemId: 1,
          name: '$itemDetails.name',
          qty: 1,
          price: '$itemDetails.price',
          photo: '$itemDetails.photo',
        },
      },
    ]);

    if (!cartItems.length) {
      return res.status(404).json({ message: 'No items in your cart' });
    }

    res.status(200).json(cartItems);
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error retrieving cart items', error: error.message });
  }
};

//update cart
exports.updateCart = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.params.userId);
  const itemId = new mongoose.Types.ObjectId(req.params.itemId);
  const { qty } = req.body;

  try {
    const updatedCartItem = await Cart.findOneAndUpdate(
      { userId, itemId, ordered: false },
      { qty },
      { new: true }
    );

    if (!updatedCartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res
      .status(200)
      .json({ data: updatedCartItem, message: 'Cart item updated' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error updating cart item', error: error.message });
  }
};

//remove from cart
exports.removeFromCart = async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.params.userId);
  const itemId = new mongoose.Types.ObjectId(req.params.itemId);

  try {
    const deletedCartItem = await Cart.findOneAndDelete({
      userId,
      itemId,
      ordered: false,
    });

    if (!deletedCartItem) {
      return res.status(404).json({ message: 'Cart item not found' });
    }

    res.status(200).json({ message: 'Cart item removed' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error removing cart item', error: error.message });
  }
};
