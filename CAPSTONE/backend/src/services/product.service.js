const Product = require("../models/productSchema");

class ProductService {
  async getProducts(filters, page = 1, limit = 9) {
    const query = { isActive: true };

    if (filters.category) query.category = filters.category;
    if (filters.subCategory) query.subCategory = filters.subCategory;
    if (filters.gradeLevel) query.gradeLevel = filters.gradeLevel;
    if (filters.status) query.status = filters.status;

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      Product.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      Product.countDocuments(query),
    ]);

    return {
      products,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        hasMore: page * limit < total,
      },
    };
  }

  async getProductById(id) {
    const product = await Product.findById(id);
    if (!product || !product.isActive) {
      throw new Error("Product not found");
    }
    return product;
  }

  async createProduct(productData) {
    const product = new Product(productData);
    return await product.save();
  }

  async updateProduct(id, updates) {
    const product = await Product.findById(id);
    if (!product || !product.isActive) {
      throw new Error("Product not found");
    }

    Object.keys(updates).forEach((key) => {
      product[key] = updates[key];
    });

    return await product.save();
  }

  async deleteProduct(id) {
    const product = await Product.findById(id);
    if (!product || !product.isActive) {
      throw new Error("Product not found");
    }

    product.isActive = false;
    await product.save();
    return true;
  }

  async checkStock(productId, size, quantity) {
    const product = await this.getProductById(productId);
    const sizeInfo = product.sizes.find((s) => s.name === size);

    if (!sizeInfo) {
      throw new Error("Size not found");
    }

    return {
      available: sizeInfo.stock >= quantity,
      currentStock: sizeInfo.stock,
      canPreOrder: product.preOrderAvailable,
    };
  }
}

module.exports = new ProductService();
