import { Request, Response } from "express";
import { categoryAttributeService } from "./category-attribute.service";
import { logger } from "../../utils/logger";

export const categoryAttributeController = {
  async createAttribute(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const result = await categoryAttributeService.createAttribute(
        String(categoryId),
        req.body,
      );
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Create category attribute failed");
      const clientErrors = [
        "Category not found",
        "Attribute key already exists for this category",
      ];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async updateAttribute(req: Request, res: Response) {
    try {
      const { categoryId, attributeId } = req.params;
      const result = await categoryAttributeService.updateAttribute(
        String(categoryId),
        String(attributeId),
        req.body,
      );
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "Update category attribute failed");
      const clientErrors = [
        "Attribute not found",
        "options is required when type is ENUM",
        "options is only allowed when type is ENUM",
      ];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async deleteAttribute(req: Request, res: Response) {
    try {
      const { categoryId, attributeId } = req.params;
      await categoryAttributeService.deleteAttribute(
        String(categoryId),
        String(attributeId),
      );
      return res.json({ success: true, message: "Attribute deleted" });
    } catch (error: any) {
      logger.error({ err: error.message }, "Delete category attribute failed");
      const clientErrors = ["Attribute not found"];
      if (clientErrors.includes(error.message)) {
        return res.status(400).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },

  async listAttributes(req: Request, res: Response) {
    try {
      const { categoryId } = req.params;
      const result = await categoryAttributeService.listAttributes(String(categoryId));
      return res.json({ success: true, data: result });
    } catch (error: any) {
      logger.error({ err: error.message }, "List category attributes failed");
      if (error.message === "Category not found") {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res
        .status(500)
        .json({ success: false, error: "Internal server error" });
    }
  },
};
