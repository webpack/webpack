"use strict";

const os = require("os");

const getErrorFor = (shouldBeAbsolute, data, schema) => {
	const message = shouldBeAbsolute ?
		`The provided value ${JSON.stringify(data)} is not an absolute path!${os.EOL}`
		: `A non absolut path is expected. However the provided value ${JSON.stringify(data)} is an absolute path!${os.EOL}`;

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
			const passes = expected === /^(?:[a-zA-Z]:)?(?:\/|\\)/.test(data);
			if(!passes) {
				getErrorFor(expected, data, schema);
				callback.errors = [getErrorFor(expected, data, schema)];
			}
			return passes;
		}
		callback.errors = [];
		return callback;
	}
});
