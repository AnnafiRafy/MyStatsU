const path = require("path");

const frontendFallback = (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  return res.sendFile(path.join(__dirname, "../../frontend", "index.html"));
};

module.exports = frontendFallback;
