const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES || "24h";

const ensureJwtSecret = () => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET belum dikonfigurasi");
  }

  return JWT_SECRET;
};

module.exports = {
  JWT_EXPIRES,
  ensureJwtSecret
};
