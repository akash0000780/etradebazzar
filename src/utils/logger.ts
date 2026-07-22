import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),

  redact: {
    paths: [
      "password",
      "*.password",
      "*.*.password",
      "token",
      "*.token",
      "*.*.token",
      "accessToken",
      "refreshToken",
      "*.accessToken",
      "*.refreshToken",
      "authorization",
      "*.authorization",
      "req.headers.authorization",
      "req.headers.cookie",
      "*.twoFactorSecret",
      "*.*.twoFactorSecret",
      "*.razorpaySignature",
      "*.accountNumber",
      "*.utrReference",
      "*.aadharNumber",
      "*.aadhaarNumber",
      "*.panNumber",
      "*.gstin",
      "*.gstNumber",
      "*.otp",
      "*.currentToken",
    ],
    censor: "**REDACTED**",
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  base: {
    pid: process.pid,
    hostname: undefined,
  },

  transport: isDev
    ? {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
        messageFormat: "{msg}",
      },
    }
    : undefined,
});
