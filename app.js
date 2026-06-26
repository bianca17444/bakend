//import express from "express";
//import cors from "cors";
//import morgan from "morgan";
// userRoute <. viene de route/users.route.js

import express from "express";
import cors from "cors";
import morgan from "morgan";


import healthRoutes from "./src/router/health.route.js";
import userRoutes from "./src/router/users.route.js";

const app = express();

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/", healthRoutes);
app.use("/users", userRoutes);

export default app;
