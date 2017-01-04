"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Gajus Kuizinas @gajus
 */
const Ajv = require("ajv");
const defineKeywords = require("ajv-keywords");
const ajv = new Ajv({
	errorDataPath: "configuration",
	allErrors: true,
	verbose: true
});
defineKeywords(ajv, ["instanceof"]);
function validateSchema(schema, options) {
	const validate = ajv.compile(schema);
	if(Array.isArray(options)) {
		const errors = options.map(validateObject);
		errors.forEach(function(list, idx) {
			list.forEach(function applyPrefix(err) {
				err.dataPath = `[${idx}]${err.dataPath}`;
				if(err.children) {
					err.children.forEach(applyPrefix);
				}
			});
		});
		return errors.reduce((arr, items) => arr.concat(items), []);
	} else {
		return validateObject(options);
	}
	function validateObject(options) {
		const valid = validate(options);
		return valid ? [] : filterErrors(validate.errors);
	}
}
function filterErrors(errors) {
	let newErrors = [];
	errors.forEach(err => {
		const dataPath = err.dataPath;
		const children = [];
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
	return newErrors;
}
module.exports = validateSchema;
