const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/',(req,res)=>{
  console.log("i said hello");
})
app.use('/uploads', express.static('uploads'));
app.use((req, res) => {
  res.status(404).json({ message: 'You are hitting the wrong API URL' });
});
// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pdf2',
});

db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
    return;
  }
  console.log('Connected to MySQL');

  const createPeopleTable = `
    CREATE TABLE IF NOT EXISTS people (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    )
  `;

  const createFilesTable = `
    CREATE TABLE IF NOT EXISTS files (
      id INT AUTO_INCREMENT PRIMARY KEY,
      file_path VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      people_id INT,
      FOREIGN KEY (people_id) REFERENCES people(id) ON DELETE CASCADE
    )
  `;

  db.query(createPeopleTable, (err, result) => {
    if (err) {
      console.error('Error creating people table:', err);
      return;
    }
    console.log('Table `people` is ready');
  });

  db.query(createFilesTable, (err, result) => {
    if (err) {
      console.error('Error creating files table:', err);
      return;
    }
    console.log('Table `files` is ready');

    // Start the server after ensuring the tables are created
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  });
});

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
app.post('/people', (req, res) => {
  const { name } = req.body;
console.log(`Adding ${name}`)
  db.query('INSERT INTO people (name) VALUES (?)', [name], (err, result) => {
    if (err) {
      console.error('Error inserting person:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({ id: result.insertId, name: name });
  });
});

// Upload PDF with title, person name, and person ID
app.post('/upload', upload.single('pdf'), (req, res) => {
  const filePath = `/uploads/${req.file.filename}`;
  const fileName = req.file.originalname;
  const title = req.body.title;
  const personName = req.body.personName;

  // Find the person by name
  db.query('SELECT id FROM people WHERE name = ?', [personName], (err, results) => {
    if (err) {
      console.error('Error finding person:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    const peopleId = results[0].id;

    // Insert file details into MySQL database
    db.query(
      'INSERT INTO files (file_path, file_name, title, people_id) VALUES (?, ?, ?, ?)',
      [filePath, fileName, title, peopleId],
      (err, result) => {
        if (err) {
          console.error('Error inserting file details:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({ filePath: filePath, fileName: fileName, title: title, peopleId: peopleId });
      }
    );
  });
});

// Get all PDFs by person name
app.get('/files/:personName', (req, res) => {
  const personName = req.params.personName;

  // Find the person by name
  db.query('SELECT id FROM people WHERE name = ?', [personName], (err, results) => {
    if (err) {
      console.error('Error finding person:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Person not found' });
    } 

    const peopleId = results[0].id;

    // Query to get all files by person ID
    db.query('SELECT id, file_name, title, file_path FROM files WHERE people_id = ?', [peopleId], (err, results) => {
      if (err) {
        console.error('Error retrieving files:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(results);
    });
  });
});


