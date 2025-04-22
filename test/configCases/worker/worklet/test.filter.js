const supportsWorker = require("../../../helpers/supportsWorker");
const supportsOptionalChaining = require("../../../helpers/supportsOptionalChaining");

module.exports = function (config) {
	return supportsWorker() && supportsOptionalChaining();
};
