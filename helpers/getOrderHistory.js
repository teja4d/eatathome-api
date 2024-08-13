const mongoose = require('mongoose');
const Order = require('../models/Order'); // Adjust the path according to your project structure

async function getOrderHistory(userId) {
  try {
    const orders = await Order.aggregate([
      // Match orders based on userId and status
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId), // Ensure userId is formatted as ObjectId
          status: 'confirmed' // Filter by order status
        }
      },
      // Lookup to join with orderdetails
      {
        $lookup: {
          from: 'orderdetails',  // The collection to join with
          localField: '_id',     // Field from the Order collection
          foreignField: 'orderId', // Field from the orderdetails collection
          as: 'orderDetails'     // Name of the new field to store joined data
        }
      },
      // Unwind the orderDetails array to process individual items
      {
        $unwind: {
          path: '$orderDetails',
          preserveNullAndEmptyArrays: true // Preserve orders with no order details
        }
      },
      // Lookup to join with items collection
      {
        $lookup: {
          from: 'items',         // The items collection
          localField: 'orderDetails.itemId', // Field from the orderdetails
          foreignField: '_id',  // Field from the items collection
          as: 'itemDetails'     // Name of the new field to store joined data
        }
      },
      // Unwind the itemDetails array to process individual items
      {
        $unwind: {
          path: '$itemDetails',
          preserveNullAndEmptyArrays: true // Preserve orderDetails with no item details
        }
      },
      // Group back to reconstruct the orderDetails array
      {
        //sort orders by orderDate
        $group: {
          _id: '$_id',
          userId: { $first: '$userId' },
          status: { $first: '$status' },
          orderDate: { $first: '$orderDate' }, 
            orderDetails: { $push: { 
            itemDetails: '$itemDetails', // Add itemDetails to each orderDetail
            quantity: '$orderDetails.qty',
            price: '$orderDetails.price',
            name: '$orderDetails.name',
            photo: '$orderDetails.photo',
            totalCost: { $multiply: ['$orderDetails.qty', '$orderDetails.price']}
          } } // Reconstruct the array of orderDetails with itemDetails
        }
      }
    ]);

    //sort orders by orderDate
    orders.sort((a, b) => b.orderDate - a.orderDate);
    //add order number to each order from todays date 2024 where 20is day and 24 is year and 001 is order number from oldest to latest order
    orders.forEach((order, index) => {
      order.orderNumber = `2024${index + 1 < 10 ? `00${index + 1}` : index + 1}`;
    });
    return orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw new Error('Error fetching orders');
  }
}

module.exports = getOrderHistory;