const supportsDefaultAssignment = require("../../../helpers/supportDefaultAssignment");
const supportsObjectDestructuring = require("../../../helpers/supportsObjectDestructuring");

module.exports = () =>
	supportsDefaultAssignment() && supportsObjectDestructuring();
