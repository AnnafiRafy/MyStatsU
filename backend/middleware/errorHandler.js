const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Terjadi kesalahan server"
  });
};

module.exports = errorHandler;
