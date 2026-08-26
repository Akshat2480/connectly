const logger = require("./logger");

module.exports = (fn) => {
  return (...args) => {
    const maybeAck = args[args.length - 1];

    Promise.resolve(fn(...args)).catch((err) => {
      logger.error("Socket handler failed", {
        message: err.message,
        stack: err.stack,
      });

      if (typeof maybeAck === "function") {
        maybeAck({ error: "Something went wrong" });
      }
    });
  };
};
