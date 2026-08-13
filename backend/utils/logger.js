const winston = require("winston");

const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

const logger = winston.createLogger({
  level: isProd ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    isProd
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, stack }) => {
            return `${timestamp} [${level}]: ${stack || message}`;
          }),
        ),
  ),
  transports: [new winston.transports.Console({ silent: isTest })],
});

if (isProd) {
  logger.add(
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
  );
  logger.add(new winston.transports.File({ filename: "logs/combined.log" }));
}

module.exports = logger;
