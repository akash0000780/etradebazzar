import { Request, Response } from "express";
import { categoryService } from "./category.service";
import { logger } from "../../utils/logger";

export const categoryController = {
  async createCategory(req: Request, res: Response) {
    try {
      const result = await categoryService.createCategory(req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Create category failed");
      const clientErrors = [
        "Category already exists",
        "Parent category not found",
        "Duplicate attribute key in request",
      ];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async updateCategory(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const result = await categoryService.updateCategory(
        String(categoryId),
        req.body,
      );
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Update category failed");
      const clientErrors = [
        "Category not found",
        "Parent category not found",
        "Category cannot be its own parent",
        "Duplicate attribute key in request",
      ];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async deleteCategory(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      await categoryService.deleteCategory(String(categoryId));
      return res.json({ success: true, message: "Category deleted" });
    } catch (error: any) {
      logger.error({ err: error.message }, "Delete category failed");
      const clientErrors = [
        "Category not found",
        "Category has subcategories  delete them first",
        "Category has products  reassign before deleting",
      ];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async listCategories(req: Request, res: Response) {
    try {
      const { parentId } = req.query as { parentId?: string };
      const result = await categoryService.listCategories(parentId);
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "List categories failed");
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async getCategoryTree(req: Request, res: Response) {
    try {
      const result = await categoryService.getCategoryTree();
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Get category tree failed");
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async getCategory(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const result = await categoryService.getCategory(String(categoryId));
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Get category failed");
      if (error.message === "Category not found") {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },
};
