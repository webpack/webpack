var DedupePlugin = require("../../../../lib/optimize/DedupePlugin");
module.exports = {
	plugins: [
		new DedupePlugin({ dedupeInstance: true }),
	]
};