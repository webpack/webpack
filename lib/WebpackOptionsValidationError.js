/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Gajus Kuizinas @gajus
*/
function WebpackOptionsValidationError(validationErrors) {
	Error.call(this);
	Error.captureStackTrace(this, WebpackOptionsValidationError);
	this.name = "WebpackOptionsValidationError";
	this.message = "Invalid configuration object. Webpack has been initialised using a configuration object that does not match the API schema. Inspect validationErrors property of the error to learn what checks have failed.";
	this.validationErrors = validationErrors;
}
module.exports = WebpackOptionsValidationError;

WebpackOptionsValidationError.prototype = Object.create(Error.prototype);
WebpackOptionsValidationError.prototype.constructor = WebpackOptionsValidationError;
