const schema = require("./loader-1.options");

module.exports = function() {
	const options = this.getOptions(schema);

	const json = JSON.stringify(options)
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");

	return `module.exports = ${json}`;
};
