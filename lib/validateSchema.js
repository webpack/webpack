/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Gajus Kuizinas @gajus
*/
var Ajv = require("ajv");
var ajv = new Ajv({
	errorDataPath: "configuration",
	allErrors: true,
	verbose: true
});
require("ajv-keywords")(ajv, ["instanceof"]);

function validateSchema(schema, options) {
	if(Array.isArray(options)) {
		var errors = options.map(validateObject.bind(this, schema));
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
		return validateObject(schema, options);
	}
}

function validateObject(schema, options) {
	var validate = ajv.compile(schema);
	var valid = validate(options);
	return valid ? [] : filterErrors(validate.errors);
}

function filterErrors(errors) {
	var newErrors = [];
	errors.forEach(function(err) {
		var dataPath = err.dataPath;
		var children = [];
		newErrors = newErrors.filter(function(oldError) {
			if(oldError.dataPath.indexOf(dataPath) >= 0) {
				if(oldError.children) {
					oldError.children.forEach(function(child) {
						children.push(child);
					});
				}
				oldError.children = undefined;
				children.push(oldError);
				return false;
			}
			return true;
		});
		if(children.length) {
			err.children = children;
		}
		newErrors.push(err);
	});
	//console.log(JSON.stringify(newErrors, 0, 2));
	return newErrors;
}

module.exports = validateSchema;
