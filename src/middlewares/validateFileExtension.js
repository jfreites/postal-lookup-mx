const ALLOWED_EXTENSIONS = ['.txt', '.csv'];

const validateFileExtension = (req, res, next) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: 'No file provided' });
  }

  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return res.status(400).json({
      success: false,
      error: `Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
    });
  }

  next();
};

module.exports = { validateFileExtension, ALLOWED_EXTENSIONS };
