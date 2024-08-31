const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect('mongodb+srv://pankajdosso21:7AoSG7J8yN8187Ws@cluster0.h5kht.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {

});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Database connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');

  // Start the server after ensuring the connection is established
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});

// Define Schemas and Models
const personSchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const fileSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  fileName: { type: String, required: true },
  title: { type: String, required: true },
  peopleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true },
});

const Person = mongoose.model('Person', personSchema);
const File = mongoose.model('File', fileSchema);

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Route to add a person
app.post('/people', async (req, res) => {
  const { name } = req.body;
  try {
    const person = new Person({ name });
    await person.save();
    res.json({ id: person._id, name });
  } catch (err) {
    console.error('Error inserting person:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Upload PDF with title, person name, and person ID
app.post('/upload', upload.single('pdf'), async (req, res) => {
  const filePath = `/uploads/${req.file.filename}`;
  const fileName = req.file.originalname;
  const title = req.body.title;
  const personName = req.body.personName;

  try {
    const person = await Person.findOne({ name: personName }).exec();
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const file = new File({
      filePath,
      fileName,
      title,
      peopleId: person._id,
    });

    await file.save();
    res.json({ filePath, fileName, title, peopleId: person._id });
  } catch (err) {
    console.error('Error inserting file details:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all PDFs by person name
app.get('/files/:personName', async (req, res) => {
  const personName = req.params.personName;

  try {
    const person = await Person.findOne({ name: personName }).exec();
    if (!person) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const files = await File.find({ peopleId: person._id }).exec();
    res.json(files);
  } catch (err) {
    console.error('Error retrieving files:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// 404 Middleware
app.use((req, res) => {
  res.status(404).json({ message: 'You are hitting the wrong API URL' });
});
