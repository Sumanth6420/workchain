require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }));
app.use(express.json());

const ObjectId = mongoose.Schema.Types.ObjectId;

// ---------- models ----------
const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['client', 'freelancer'], required: true },
  wallet: { type: String, default: '' },
}, { timestamps: true }));

const Project = mongoose.model('Project', new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  budget: { type: Number, required: true },
  client: { type: ObjectId, ref: 'User', required: true },
  freelancer: { type: ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['open', 'in-progress', 'completed'], default: 'open' },
  freelancerAccepted: { type: Boolean, default: false },
  freelancerAcceptedAt: { type: Date, default: null },
  contractAddress: { type: String, default: '' },
  contractTx: { type: String, default: '' },
  milestones: [{
    title: String,
    amount: Number,
    status: { type: String, default: 'created' },
    fundTx: String,
    submitTx: String,
    approveTx: String,
  }],
}, { timestamps: true }));

const proposalSchema = new mongoose.Schema({
  project: { type: ObjectId, ref: 'Project', required: true },
  freelancer: { type: ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  bid: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });
proposalSchema.index({ project: 1, freelancer: 1 }, { unique: true });
const Proposal = mongoose.model('Proposal', proposalSchema);

// ---------- helpers ----------
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    if (e.code === 11000) return res.status(409).json({ message: 'Already exists' });
    console.error(e);
    res.status(500).json({ message: e.message });
  });

function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    req.user = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ message: 'Unauthorized' });
  }
}

const role = (r) => (req, res, next) =>
  req.user.role === r ? next() : res.status(403).json({ message: r + 's only' });

const validId = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id)
    ? next()
    : res.status(400).json({ message: 'Invalid id' });

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, role: u.role, wallet: u.wallet });
const makeToken = (u) =>
  jwt.sign({ id: String(u._id), role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: '7d' });

// ---------- routes ----------
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password, role: r, wallet } = req.body;
  if (!name || !email || !password || !['client', 'freelancer'].includes(r))
    return res.status(400).json({ message: 'Invalid input' });
  if (password.length < 6)
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({
    name, email, role: r, wallet: wallet || '',
    password: await bcrypt.hash(password, 10),
  });
  res.status(201).json({ token: makeToken(user), user: publicUser(user) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(401).json({ message: 'Invalid credentials' });
  res.json({ token: makeToken(user), user: publicUser(user) });
}));

app.patch('/api/me/wallet', auth, wrap(async (req, res) => {
  const { wallet } = req.body;
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet || ''))
    return res.status(400).json({ message: 'Invalid wallet address' });
  await User.findByIdAndUpdate(req.user.id, { wallet });
  res.json({ message: 'Wallet saved', wallet });
}));

app.get('/api/projects', wrap(async (req, res) => {
  res.json(await Project.find()
    .populate('client', 'name')
    .populate('freelancer', 'name wallet')
    .sort({ createdAt: -1 }));
}));

app.get('/api/projects/:id', validId, wrap(async (req, res) => {
  const p = await Project.findById(req.params.id)
    .populate('client', 'name wallet')
    .populate('freelancer', 'name wallet');
  if (!p) return res.status(404).json({ message: 'Project not found' });
  res.json(p);
}));

app.post('/api/projects', auth, role('client'), wrap(async (req, res) => {
  const { title, description, budget, milestones } = req.body;
  if (!title || !description || !(Number(budget) >= 0))
    return res.status(400).json({ message: 'Title, description and budget are required' });
  if (!Array.isArray(milestones) || milestones.length === 0 ||
      milestones.some((m) => !m.title || !(Number(m.amount) > 0)))
    return res.status(400).json({ message: 'At least one milestone with a title and amount > 0 is required' });
  const project = await Project.create({
    title, description, budget: Number(budget), client: req.user.id,
    milestones: milestones.map((m) => ({ title: m.title, amount: Number(m.amount) })),
  });
  res.status(201).json(project);
}));

app.post('/api/projects/:id/proposals', auth, role('freelancer'), validId, wrap(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (project.status !== 'open')
    return res.status(400).json({ message: 'Project is not open for proposals' });
  const { message, bid } = req.body;
  if (!message || !(Number(bid) >= 0))
    return res.status(400).json({ message: 'Message and bid are required' });
  try {
    const proposal = await Proposal.create({
      project: project._id, freelancer: req.user.id, message, bid: Number(bid),
    });
    res.status(201).json(proposal);
  } catch (e) {
    if (e.code === 11000)
      return res.status(409).json({ message: 'You already submitted a proposal for this project' });
    throw e;
  }
}));

app.get('/api/projects/:id/proposals', auth, role('client'), validId, wrap(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (String(project.client) !== req.user.id)
    return res.status(403).json({ message: 'Not your project' });
  res.json(await Proposal.find({ project: project._id })
    .populate('freelancer', 'name email wallet')
    .sort({ createdAt: -1 }));
}));

app.get('/api/proposals/mine', auth, role('freelancer'), wrap(async (req, res) => {
  res.json(await Proposal.find({ freelancer: req.user.id })
    .populate('project', 'title status')
    .sort({ createdAt: -1 }));
}));

app.post('/api/proposals/:id/accept', auth, role('client'), validId, wrap(async (req, res) => {
  const proposal = await Proposal.findById(req.params.id);
  if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
  const project = await Project.findById(proposal.project);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (String(project.client) !== req.user.id)
    return res.status(403).json({ message: 'Not your project' });
  if (project.status !== 'open')
    return res.status(400).json({ message: 'Project is no longer open' });

  project.freelancer = proposal.freelancer;
  project.status = 'in-progress';
  await project.save();

  proposal.status = 'accepted';
  await proposal.save();
  await Proposal.updateMany(
    { project: project._id, _id: { $ne: proposal._id } },
    { status: 'rejected' }
  );

  res.json(await Project.findById(project._id)
    .populate('client', 'name')
    .populate('freelancer', 'name wallet'));
}));

app.post('/api/projects/:id/confirm', auth, role('freelancer'), validId, wrap(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!project.freelancer || String(project.freelancer) !== req.user.id)
    return res.status(403).json({ message: 'You are not assigned to this project' });
  project.freelancerAccepted = true;
  project.freelancerAcceptedAt = new Date();
  await project.save();
  res.json(project);
}));

app.post('/api/projects/:id/contract', auth, role('client'), validId, wrap(async (req, res) => {
  const { contractAddress, txHash } = req.body;
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress || ''))
    return res.status(400).json({ message: 'Invalid contract address' });
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (String(project.client) !== req.user.id)
    return res.status(403).json({ message: 'Not your project' });
  if (!project.freelancerAccepted)
    return res.status(400).json({ message: 'Freelancer has not confirmed yet' });
  if (project.contractAddress)
    return res.status(400).json({ message: 'Contract already created' });
  project.contractAddress = contractAddress;
  project.contractTx = txHash || '';
  await project.save();
  res.json(project);
}));

const TX_RULES = {
  fund:    { role: 'client',     from: 'created',   to: 'funded',    field: 'fundTx' },
  submit:  { role: 'freelancer', from: 'funded',    to: 'submitted', field: 'submitTx' },
  approve: { role: 'client',     from: 'submitted', to: 'completed', field: 'approveTx' },
};

app.post('/api/projects/:id/milestones/:index/tx', auth, validId, wrap(async (req, res) => {
  const { action, txHash } = req.body;
  const rule = TX_RULES[action];
  if (!rule) return res.status(400).json({ message: 'Invalid action' });
  if (req.user.role !== rule.role)
    return res.status(403).json({ message: rule.role + 's only' });
  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash || ''))
    return res.status(400).json({ message: 'Invalid transaction hash' });

  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });
  if (!project.contractAddress)
    return res.status(400).json({ message: 'No contract created yet' });

  const owner = rule.role === 'client' ? project.client : project.freelancer;
  if (!owner || String(owner) !== req.user.id)
    return res.status(403).json({ message: 'Not your project' });

  const milestone = project.milestones[Number(req.params.index)];
  if (!milestone) return res.status(404).json({ message: 'Milestone not found' });
  if (milestone.status !== rule.from)
    return res.status(400).json({ message: 'Milestone must be ' + rule.from + ' first' });

  milestone.status = rule.to;
  milestone[rule.field] = txHash;
  if (project.milestones.every((m) => m.status === 'completed'))
    project.status = 'completed';
  await project.save();

  res.json(await Project.findById(project._id)
    .populate('client', 'name')
    .populate('freelancer', 'name wallet'));
}));

// ---------- start ----------
const PORT = process.env.PORT || 5001;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log('API running on http://localhost:' + PORT)))
  .catch((e) => { console.error(e); process.exit(1); });
