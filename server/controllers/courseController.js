const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getCourses = async (req, res) => {
  try {
    const { importId } = req.query;
    if (!importId) return res.status(400).json({ message: "Missing importId" });
    
    const courses = await prisma.course.findMany({
      where: { importId: importId },
      include: { offerings: { include: { options: true } } }
    });
    
    const formatted = courses.map(c => ({
        ...c,
        offerings: c.offerings.map(o => ({
            ...o,
            options: o.options.map(opt => ({
                ...opt,
                sessions: JSON.parse(opt.sessions || "[]"),
                rawCodes: JSON.parse(opt.rawCodes || "[]")
            }))
        }))
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
