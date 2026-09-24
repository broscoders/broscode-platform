import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { authRouter } from "./routes/auth";
import { leadsRouter } from "./routes/leads";
import { categoriesRouter } from "./routes/categories";
import { templatesRouter, emailRouter } from "./routes/templates";
import { emailAccountsRouter } from "./routes/email-accounts";
import { dashboardRouter } from "./routes/dashboard";
import { assistantRouter } from "./routes/assistant";
import { customersRouter, dealsRouter } from "./routes/crm";
import { teamRouter } from "./routes/team";
import { ordersRouter } from "./routes/orders";
import { projectsRouter } from "./routes/projects";
import { expensesRouter } from "./routes/expenses";
import { analyticsRouter } from "./routes/analytics";
import { searchRouter } from "./routes/search";
import { notificationsRouter } from "./routes/notifications";
import { calendarRouter } from "./routes/calendar";
import { auditRouter } from "./routes/audit";
import { callsRouter } from "./routes/calls";
import { coldEmailRouter } from "./routes/cold-email";

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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/auth", authRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/email", emailRouter);
app.use("/api/email-accounts", emailAccountsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api/customers", customersRouter);
app.use("/api/deals", dealsRouter);
app.use("/api/team", teamRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/search", searchRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/audit", auditRouter);
app.use("/api/calls", callsRouter);
app.use("/api/cold-email", coldEmailRouter);

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