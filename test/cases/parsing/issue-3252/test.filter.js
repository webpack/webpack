var supportsDefaultAssignment = require("../../../helpers/supportDefaultAssignment");

module.exports = function(config) {
	return !config.minimize && supportsDefaultAssignment();
};
