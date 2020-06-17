module.exports = c => `module.exports = ${JSON.stringify(c.trim() + "\ntoml")}`;
