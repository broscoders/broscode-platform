import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { authRouter } from "@/routes/auth";
import { leadsRouter } from "@/routes/leads";
import { categoriesRouter } from "@/routes/categories";
import { templatesRouter, emailRouter } from "@/routes/templates";
import { emailAccountsRouter } from "@/routes/email-accounts";
import { dashboardRouter } from "@/routes/dashboard";

const app = express();
const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

app.use(helmet());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/email", emailRouter);
app.use("/api/email-accounts", emailAccountsRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Bro's Code API running on http://localhost:${PORT}`);
  });
}

export default app;
