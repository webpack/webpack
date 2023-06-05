var supportsWorker = require("../../../helpers/supportsWorker");
var supportsOptionalChaining = require("../../../helpers/supportsOptionalChaining");

module.exports = function (config) {
	return supportsWorker() && supportsOptionalChaining();
};
