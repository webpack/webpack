"use strict";

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
		function callback(data) {
			const passes = expected === /^(?:[A-Za-z]:\\|\/)/.test(data);
			if(!passes) {
				callback.errors = [getErrorFor(expected, data, schema)];
			}
			return passes;
		}
		callback.errors = [];
		return callback;
	}
});
