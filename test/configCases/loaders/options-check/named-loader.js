"use strict";

const check = require("./check");
const schema = /** @type {EXPECTED_ANY} */ (require("./loader.options.json"));

// Names itself in the errors rather than by the schema title
/** @type {import("../../../../").LoaderDefinition<{ name: string }>} */
module.exports = function namedLoader() {
	const options = this.getOptions(schema, check, {
		name: "Named Loader",
		baseDataPath: "query"
	});

	return `module.exports = ${JSON.stringify(options)}`;
};
