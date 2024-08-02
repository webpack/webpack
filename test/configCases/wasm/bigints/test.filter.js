const supports = require("webassembly-feature");

module.exports = function (config) {
	// eslint-disable-next-line new-cap
	return supports["JS-BigInt-integration"]();
};
