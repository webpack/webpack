"use strict";

const path = require("path");

const getErrorFor = (shouldBeAbsolute, data, schema) => {
	const message = shouldBeAbsolute ?
		`The provided value ${JSON.stringify(data)} is not an absolute path!`
		: `A relative path is expected. However the provided value ${JSON.stringify(data)} is an absolute path!`;

	return {
		keyword: "absolutePath",
		params: { absolutePath: data },
		message: message,
		parentSchema: schema,
	};
};
module.exports = (ajv) => ajv.addKeyword("absolutePath", {
	errors: true,
	type: "string",
	compile(expected, schema) {
		const callback = expected ? data => {
			if (path.isAbsolute(data)) {
				if (data.indexOf("!") >= 0) {
					callback.errors = [{
						keyword: "absolutePath",
						params: { absolutePath: data },
						message: "Exclamation mark is reserved for loader syntax, remove it from directory names.",
						parentSchema: schema,
					}];
					return false;
				}
				return true;
			}
			callback.errors = [getErrorFor(expected, data, schema)];
			return false;
		} : data => {
			if (path.isAbsolute(data)) {
				callback.errors = [getErrorFor(expected, data, schema)];
				return false;
			}
			return true;
		};
		callback.errors = [];
		return callback;
	}
});
