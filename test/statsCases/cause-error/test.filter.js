const supportsErrorCause = require("../../helpers/supportsErrorCause");
const supportsAggregateError = require("../../helpers/supportsAggregateError");

module.exports = function () {
	return supportsErrorCause() && supportsAggregateError();
};
