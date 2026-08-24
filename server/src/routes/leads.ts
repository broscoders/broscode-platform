import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import {
  searchGooglePlaces,
  enrichEmailFromWebsite,
  inferCategoryName,
  scoreLead,
} from "../lib/lead-discovery";

export const leadsRouter = Router();
leadsRouter.use(requireAuth);

const discoverSchema = z.object({
  industry: z.string().min(2),
  city: z.string().min(1),
  country: z.string().min(1).default(""),
  keywords: z.string().optional().default(""),
  quantity: z.number().int().min(1).max(200).default(20),
});

// AI LEAD FINDER ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â discovers real businesses via OpenStreetMap, enriches
// with a best-effort email lookup, auto-categorizes, and scores each lead.
leadsRouter.post("/discover", async (req: AuthedRequest, res) => {
  const parsed = discoverSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input.", details: parsed.error.flatten() });
  }
  const { industry, city, country, keywords, quantity } = parsed.data;

  let places;
  try {
    places = await searchGooglePlaces(industry, city, country, keywords, quantity);
  } catch (err) {
    return res.status(502).json({ error: (err as Error).message });
  }

  const source = await prisma.leadSource.upsert({
    where: { name: "OpenStreetMap" },
    create: { name: "OpenStreetMap" },
    update: {},
  });

  const created = [];
  for (const place of places) {
    // duplicate check by business name + city
    const existing = await prisma.lead.findFirst({
      where: { businessName: place.businessName, city: place.city ?? undefined },
    });
    if (existing) continue;

    const email = await enrichEmailFromWebsite(place.website);
    const categoryName = inferCategoryName(place.osmTypes, industry);
    const category = await prisma.category.upsert({
      where: { name: categoryName },
      create: { name: categoryName },
      update: {},
    });

    const { score, priority } = scoreLead({
      hasWebsite: Boolean(place.website),
      hasEmail: Boolean(email),
      hasPhone: Boolean(place.phone),
    });

    const lead = await prisma.lead.create({
      data: {
        businessName: place.businessName,
        website: place.website,
        email, // null -> client renders "Not Found"
        phone: place.phone,
        address: place.address,
        city: place.city,
        country: place.country,
        categoryId: category.id,
        sourceId: source.id,
        score,
        priority,
        status: "NEW",
        activities: { create: { type: "discovered", message: "Lead discovered via OpenStreetMap." } },
      },
    });
    created.push(lead);
  }

  if (created.length > 0) {
    const admins = await prisma.user.findMany({ where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } } });
    await prisma.notification.createMany({
      data: admins.map((a: { id: string }) => ({
        userId: a.id,
        type: "new_leads",
        message: `${created.length} new lead${created.length === 1 ? "" : "s"} discovered (${industry} in ${city})`,
      })),
    });
  }

  return res.status(201).json({
    requested: quantity,
    found: places.length,
    savedNew: created.length,
    duplicatesSkipped: places.length - created.length,
    leads: created,
  });
});

const listQuerySchema = z.object({
  category: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  hasEmail: z.string().optional(),
  hasPhone: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

leadsRouter.get("/", async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid filters." });
  const f = parsed.data;

  const where: Record<string, unknown> = {};
  if (f.category) where.category = { name: f.category };
  if (f.city) where.city = f.city;
  if (f.country) where.country = f.country;
  if (f.status) where.status = f.status;
  if (f.priority) where.priority = f.priority;
  if (f.assignedTo) where.assignedToId = f.assignedTo;
  if (f.hasEmail === "true") where.email = { not: null };
  if (f.hasEmail === "false") where.email = null;
  if (f.hasPhone === "true") where.phone = { not: null };
  if (f.hasPhone === "false") where.phone = null;
  if (f.q) {
    where.OR = [
      { businessName: { contains: f.q, mode: "insensitive" } },
      { email: { contains: f.q, mode: "insensitive" } },
      { city: { contains: f.q, mode: "insensitive" } },
    ];
  }

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: { category: true, assignedTo: true },
      orderBy: { createdAt: "desc" },
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
  ]);

  return res.json({ total, page: f.page, pageSize: f.pageSize, leads });
});

leadsRouter.get("/:id", async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      assignedTo: true,
      activities: { orderBy: { createdAt: "desc" } },
      emailLogs: { orderBy: { sentAt: "desc" } },
      followUps: { orderBy: { dueDate: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      deals: true,
    },
  });
  if (!lead) return res.status(404).json({ error: "Lead not found." });
  return res.json(lead);
});

const updateSchema = z.object({
  status: z
    .enum([
      "NEW",
      "QUALIFIED",
      "CONTACTED",
      "REPLIED",
      "INTERESTED",
      "MEETING",
      "PROPOSAL",
      "NEGOTIATION",
      "WON",
      "LOST",
      "NOT_INTERESTED",
      "DO_NOT_CONTACT",
    ])
    .optional(),
  categoryId: z.string().optional(),
  assignedToId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

leadsRouter.patch("/:id", async (req: AuthedRequest, res) => {
  const leadId = String(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input." });

  const { status, categoryId, assignedToId, tags } = parsed.data;

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      ...(status !== undefined && { status }),
      ...(categoryId !== undefined && { categoryId }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(tags !== undefined && { tags }),
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: req.user!.userId,
      type: "updated",
      message: `Lead updated: ${Object.keys(parsed.data).join(", ")}`,
    },
  });

  if (status && ["REPLIED", "DO_NOT_CONTACT", "WON"].includes(status)) {
    await prisma.followUpTask.updateMany({
      where: { leadId: lead.id, status: "pending" },
      data: { status: "stopped" },
    });
  }

  if (assignedToId) {
    await prisma.notification.create({
      data: {
        userId: assignedToId,
        type: "lead_assigned",
        message: `You were assigned lead: ${lead.businessName}`,
      },
    });
  }

  return res.json(lead);
});

leadsRouter.post("/:id/notes", async (req: AuthedRequest, res) => {
  const content = String(req.body?.content ?? "").trim();
  if (!content) return res.status(400).json({ error: "Note content is required." });

  const note = await prisma.note.create({
    data: { leadId: String(req.params.id), userId: req.user!.userId, content },
  });
  return res.status(201).json(note);
});
