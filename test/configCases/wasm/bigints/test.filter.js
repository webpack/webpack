const supports = require("webassembly-feature");

module.exports = function(config) {
	return supports["JS-BigInt-integration"]();
};
