import { Pool } from "pg";
import { config } from "./config.js";

export const pool = new Pool({
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  user: config.dbUser,
  password: config.dbPassword,
  ssl: {
    rejectUnauthorized: false,
  },
});
 
