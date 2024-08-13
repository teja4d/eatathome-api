const Order = require('../models/Order');
const OrderDetail = require('../models/OrderDetail');
const Cart = require('../models/Cart');
const getOrderHistory = require('../helpers/getOrderHistory');

exports.addOrder = async (req, res) => {
  const { userId } = req.body;
  try {
    // Create a new order
    const order = new Order({
      userId,
      orderDate: new Date(),
      status: 'confirmed',
    });
    const orderResult = await order.save();
    // Retrieve cart items that are not ordered yet
    const cartItems = await Cart.find({ userId, ordered: false });
    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'No items in cart to order' });
    }
    // Track whether all updates are successful
    let allUpdatesSuccessful = true;
    // For each cart item, create an order detail and mark the cart item as ordered
    for (let item of cartItems) {
      const orderDetail = new OrderDetail({
        orderId: orderResult._id,
        itemId: item.itemId,
        qty: item.qty,
      });

      // Attempt to save the OrderDetail
      const savedOrderDetail = await orderDetail.save();
      if (!savedOrderDetail) {
        allUpdatesSuccessful = false;
        break; // Exit loop on first failure
      }
      // Attempt to mark the cart item as ordered
      item.ordered = true;
      const updatedCartItem = await item.save();
      if (!updatedCartItem) {
        allUpdatesSuccessful = false;
        break; // Exit loop on first failure
      }
    }
    if (!allUpdatesSuccessful) {
      // Handle partial updates or failures here
      // This could involve manual rollback steps or compensating actions
      return res.status(500).json({
        message:
          'Error processing order, some items may not have been updated correctly',
      });
    }
    // Respond with the order ID and success message
    res.status(201).json({ orderId: orderResult._id, message: 'Order placed' });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error placing order', error: error.toString() });
  }
};

exports.showOrders = async (req, res) => {
  const { userId } = req.params;
  try {
    const orders = await getOrderHistory(userId);
    if (!orders.length) {
      return res.status(200).json({ message: 'No orders found' });
    }
  
    res.status(200).json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};
