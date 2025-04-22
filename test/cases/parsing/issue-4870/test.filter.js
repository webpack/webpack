const supportsIteratorDestructuring = require("../../../helpers/supportsIteratorDestructuring");
const supportsObjectDestructuring = require("../../../helpers/supportsObjectDestructuring");

module.exports = function (config) {
	return supportsObjectDestructuring() && supportsIteratorDestructuring();
};
