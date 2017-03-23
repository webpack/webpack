"use strict";

const getErrorFor = (shouldBeAbsolute, data, schema) => {
	const message = shouldBeAbsolute ?
		`The provided value ${JSON.stringify(data)} is not an absolute path!`
		: `A relative path is expected. However the provided value ${JSON.stringify(data)} is an absolute path! Please use output.path to specify absolute path and output.filename for the file name.`;

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
			const passes = expected === /^(?:[A-Z]:\\|\/)/.test(data);
			if(!passes) {
				callback.errors = [getErrorFor(expected, data, schema)];
			}
			return passes;
		}
		callback.errors = [];
		return callback;
	}
});
