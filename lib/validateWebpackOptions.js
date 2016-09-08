/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Gajus Kuizinas @gajus
*/
var webpackOptionsSchema = require("./../schemas/webpackOptionsSchema.json");
var Ajv = require("ajv");
var ajv = new Ajv();
var validate = ajv.compile(webpackOptionsSchema);
function validateWebpackOptions(options) {
	var valid = validate(options);
	return valid ? [] : validate.errors;
}
module.exports = validateWebpackOptions;
