/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Gajus Kuizinas @gajus
*/
function WebpackOptionsValidationError(validationErrors) {
	Error.call(this);
	Error.captureStackTrace(this, WebpackOptionsValidationError);
	this.name = "WebpackOptionsValidationError";
	this.message = "Passed 'options' object does not look like a valid webpack configuration.";
	this.validationErrors = validationErrors;
}
module.exports = WebpackOptionsValidationError;

WebpackOptionsValidationError.prototype = Object.create(Error.prototype);
WebpackOptionsValidationError.prototype.constructor = WebpackOptionsValidationError;
