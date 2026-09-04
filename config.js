import "dotenv/config";

export const config = {
  port: process.env.PORT,

  dbHost: process.env.DB_HOST,
  dbPort: process.env.DB_PORT,
  dbName: process.env.DB_NAME,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,

  jwtSecret: process.env.JWT_SECRET,
};