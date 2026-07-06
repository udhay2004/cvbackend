const express = require('express');
const Project = require('../models/Project');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

// GET /api/projects?status=open,closed — PUBLIC.
// Never returns contactEmail/contactPhone/companyName — a visitor hitting
// this without a status filter should not see pending submissions either.
router.get('/', async (req, res) => {
  try {
    const statusParam = req.query.status;
    const filter = statusParam
      ? { status: { $in: statusParam.split(',') } }
      : { status: { $in: ['open', 'closed'] } }; // never 'pending' by default
    const projects = await Project.find(filter)
      .select('-contactEmail -contactPhone -companyName')
      .sort({ createdAt: -1 });
    res.json({ projects });
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Could not load projects.' });
  }
});

// GET /api/projects/admin/all — ADMIN ONLY. All statuses, full contact fields.
// Must be registered BEFORE /:slug below, or Express will treat "admin" as a slug.
router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ error: 'Could not load projects.' });
  }
});

// GET /api/projects/:slug — PUBLIC, same field restrictions as above.
router.get('/:slug', async (req, res) => {
  try {
    const project = await Project.findOne({ slug: req.params.slug })
      .select('-contactEmail -contactPhone -companyName');
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Could not load project.' });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { title, industry, country, summary, details, companyName, contactEmail, contactPhone } = req.body;
    if (!title || !industry || !country || !summary || !details || !companyName || !contactEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    let slug = slugify(title);
    if (await Project.findOne({ slug })) slug = `${slug}-${Date.now().toString(36)}`;

    const project = await Project.create({
      slug, title, industry, country, summary, details, companyName, contactEmail, contactPhone,
      status: 'pending',
    });

    res.status(201).json(project);
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Could not submit project.' });
  }
});

module.exports = router;
