const crypto = require('crypto');

const generateApiKey = (prefix = 'pcx') => {
  const randomBytes = crypto.randomBytes(24);
  const key = `${prefix}_${randomBytes.toString('hex')}`;
  return key;
};

if (require.main === module) {
  const prefix = process.argv[2] || 'pcx';
  const apiKey = generateApiKey(prefix);
  console.log(apiKey);
}

module.exports = { generateApiKey };