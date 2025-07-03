const supportDefaultAssignment = require("../../../helpers/supportDefaultAssignment");
const supportsES6 = require("../../../helpers/supportsES6");
const supportsIteratorDestructuring = require("../../../helpers/supportsIteratorDestructuring");
const supportsObjectDestructuring = require("../../../helpers/supportsObjectDestructuring");

module.exports = () =>
	supportsES6() &&
	supportDefaultAssignment() &&
	supportsObjectDestructuring() &&
	supportsIteratorDestructuring();
