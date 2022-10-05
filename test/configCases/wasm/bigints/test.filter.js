const wasmFeatures = require("webassembly-feature");

module.exports = function(config) {
	return wasmFeatures["JS-BigInt-integration"];
};
