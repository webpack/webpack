const context = require.context("./dir", false, /^\.\/value\.js$/);

module.exports = {
	id: context.id,
	value: context("./value.js")
};
