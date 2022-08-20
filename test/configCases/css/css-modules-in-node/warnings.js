module.exports = require("../css-modules/warnings");
for (const item of module.exports.slice(0, module.exports.length / 2))
	module.exports.push(item);
