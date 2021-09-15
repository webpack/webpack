var supportsDefaultAssignment = require("../../../helpers/supportDefaultAssignment");
var supportsObjectDestructuring = require("../../../helpers/supportsObjectDestructuring");

module.exports = function (config) {
	return supportsDefaultAssignment() && supportsObjectDestructuring();
};
