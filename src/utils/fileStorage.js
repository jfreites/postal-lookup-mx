const { v4: uuidv4 } = require('uuid');
const path = require('path');

const generateUniqueFilename = (originalname) => {
  const ext = path.extname(originalname).toLowerCase();
  const timestamp = Date.now();
  const uniqueId = uuidv4().slice(0, 8);
  return `${timestamp}-${uniqueId}${ext}`;
};

module.exports = { generateUniqueFilename };
