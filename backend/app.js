const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

require("dotenv").config();

const sequelize = require("./config/database");
const defaultAdmin = require("./config/defaultAdmin");
const { Admin } = require("./models");

const apiRoutes = require("./routes");
const frontendFallback = require("./middleware/frontendFallback");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRoutes);

app.use(express.static(path.join(__dirname, "../frontend")));
app.get("*", frontendFallback);
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

const syncDefaultAdmin = async () => {
  const password = await bcrypt.hash(defaultAdmin.password, 12);
  const [admin, created] = await Admin.findOrCreate({
    where: { email: defaultAdmin.email },
    defaults: {
      nama: defaultAdmin.name,
      email: defaultAdmin.email,
      password,
    },
  });

  if (!created) {
    await admin.update({
      nama: defaultAdmin.name,
      password,
    });
  }
};

const listen = (message) => {
  app.listen(PORT, () => {
    console.log(message);
  });
};

const startServer = async () => {
  try {
    await sequelize.sync();
    await syncDefaultAdmin();
    console.log("Database connected");
    listen(`Server running on port ${PORT}`);
  } catch (err) {
    console.error("Database connection failed:", err && err.message ? err.message : err);
    listen(`Server running on port ${PORT} (DB connection failed)`);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
