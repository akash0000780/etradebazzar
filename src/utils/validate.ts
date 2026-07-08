import { z } from "zod";
import  { Request, Response, NextFunction } from "express";

import { logger } from "../utils/logger";

export const validate = (schema: z.ZodObject<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.safeParseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
      });

      if (!parsed.success) {
        const formatted = parsed.error.format();

        logger.warn(
          {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
            errors: formatted,
          },
          "Validation failed"
        );

        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: Object.entries(formatted)
            .filter(([key]) => key !== "_errors")
            .flatMap(([key, value]: [string, any]) =>
              value._errors.map((msg: string) => ({
                field: key,
                message: msg,
              }))
            ),
        });
      }

      req.body = parsed.data.body || req.body;
      req.query = parsed.data.query || (req.query as any);
      req.params = parsed.data.params || (req.params as any);

      next();
    } catch (error) {
      logger.error({ error }, "Unexpected validation error");

      res.status(500).json({ error: "Internal server error" });
    }
  };
};
