/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Gajus Kuizinas @gajus
*/
var webpackOptionsSchema = require("../schemas/webpackOptionsSchema.json");
var Ajv = require("ajv");
var ajv = new Ajv({
	errorDataPath: "configuration",
	allErrors: true,
	verbose: true
});
var validate = ajv.compile(webpackOptionsSchema);

function validateWebpackOptions(options) {
	if(Array.isArray(options)) {
		var errors = options.map(validateObject);
		errors.forEach(function(list, idx) {
			list.forEach(function applyPrefix(err) {
				err.dataPath = "[" + idx + "]" + err.dataPath;
				if(err.children) {
					err.children.forEach(applyPrefix);
				}
			});
		});
		return errors.reduce(function(arr, items) {
			return arr.concat(items);
		}, []);
	} else {
		return validateObject(options);
	}
}

function validateObject(options) {
	var valid = validate(options);
	return valid ? [] : filterErrors(validate.errors);
}

function filterErrors(errors) {
	var errorsByDataPath = {};
	var newErrors = [];
	errors.forEach(function(err) {
		var dataPath = err.dataPath;
		var key = "$" + dataPath;
		if(errorsByDataPath[key]) {
			var oldError = errorsByDataPath[key];
			var idx = newErrors.indexOf(oldError);
			newErrors.splice(idx, 1);
			if(oldError.children) {
				var children = oldError.children;
				delete oldError.children;
				children.push(oldError);
				err.children = children;
			} else {
				err.children = [oldError];
			}
		}
		errorsByDataPath[key] = err;
		newErrors.push(err);
	});
	return newErrors;
}

module.exports = validateWebpackOptions;
