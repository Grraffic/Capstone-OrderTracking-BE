const ProductService = require("../services/product.service");

class ProductController {
  async getProducts(req, res) {
    try {
      const { page, limit, ...filters } = req.query;
      const result = await ProductService.getProducts(
        filters,
        parseInt(page),
        parseInt(limit)
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async getProductById(req, res) {
    try {
      const product = await ProductService.getProductById(req.params.id);
      res.json(product);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async createProduct(req, res) {
    try {
      const product = await ProductService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async updateProduct(req, res) {
    try {
      const product = await ProductService.updateProduct(
        req.params.id,
        req.body
      );
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteProduct(req, res) {
    try {
      await ProductService.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async checkStock(req, res) {
    try {
      const { productId, size, quantity } = req.query;
      const stockInfo = await ProductService.checkStock(
        productId,
        size,
        parseInt(quantity)
      );
      res.json(stockInfo);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new ProductController();
