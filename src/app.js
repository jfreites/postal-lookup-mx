const express = require('express');
const cors = require('cors');
const sepomexRoutes = require('./routes/sepomexRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/sepomex', sepomexRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  res.status(500).json({ success: false, error: 'Internal server error' });
});

module.exports = app;
