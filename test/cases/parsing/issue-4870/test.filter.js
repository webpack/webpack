var supportsIteratorDestructuring = require("../../../helpers/supportsIteratorDestructuring");
var supportsObjectDestructuring = require("../../../helpers/supportsObjectDestructuring");

module.exports = function (config) {
	return supportsObjectDestructuring() && supportsIteratorDestructuring();
};
