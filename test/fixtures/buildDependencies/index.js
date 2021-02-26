/* global VALUE */

module.exports = {
	loader: require("./loader!"),
	config: VALUE,
	esmConfig: VALUE2,
	esmAsyncConfig: VALUE3,
	uncached: require("./module")
};
