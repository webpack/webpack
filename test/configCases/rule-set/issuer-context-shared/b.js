const context = require.context("./files", false, /\.txt$/);

module.exports = {
	id: context.id,
	values: context
		.keys()
		.sort()
		.map((key) => context(key))
};
