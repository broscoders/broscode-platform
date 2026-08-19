import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth";

export const categoriesRouter = Router();
categoriesRouter.use(requireAuth);

categoriesRouter.get("/", async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { archived: false },
    orderBy: { name: "asc" },
    include: { _count: { select: { leads: true } } },
  });
  res.json(categories);
});

const createSchema = z.object({ name: z.string().min(2), parentId: z.string().optional() });

categoriesRouter.post("/", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });
  const category = await prisma.category.create({ data: parsed.data });
  res.status(201).json(category);
});

categoriesRouter.patch("/:id", async (req, res) => {
  const { name, archived } = req.body ?? {};
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: { ...(name && { name }), ...(typeof archived === "boolean" && { archived }) },
  });
  res.json(category);
});
