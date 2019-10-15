/* global VALUE */

module.exports = {
	loader: require("./loader!"),
	config: VALUE,
	uncached: require("./module")
};
