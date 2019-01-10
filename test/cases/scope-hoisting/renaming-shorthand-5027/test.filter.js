var supportsES6 = require("../../../helpers/supportsES6");
var supportDefaultAssignment = require("../../../helpers/supportDefaultAssignment");
var supportsObjectDestructuring = require("../../../helpers/supportsObjectDestructuring");
var supportsIteratorDestructuring = require("../../../helpers/supportsIteratorDestructuring");

module.exports = function(config) {
	return !config.minimize &&
		supportsES6() &&
		supportDefaultAssignment() &&
		supportsObjectDestructuring() &&
		supportsIteratorDestructuring();
};
