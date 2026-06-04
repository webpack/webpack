"use strict";

// Mock of the webpack API that webpack-cli consumes, injected via the documented
// WEBPACK_PACKAGE env var. cli.getArguments/processArguments delegate to the real
// implementation over a schema covering every CLI argument type; the callable
// captures the config webpack-cli assembles from the parsed flags.
const fs = require("fs");
const cli = require("../../../lib/cli");

const schema = {
	type: "object",
	additionalProperties: false,
	properties: {
		flag: { type: "boolean" },
		count: { type: "number" },
		name: { type: "string" },
		output: { type: "string", absolutePath: true },
		pattern: { instanceof: "RegExp" },
		level: { enum: ["info", "warn"] },
		list: { type: "array", items: { type: "string" } },
		mode: { const: "production" },
		boolConst: { const: true },
		numConst: { const: 5 }
	},
	// Conditional branches contribute their own flags.
	if: { properties: { mode: { const: "production" } } },
	then: { type: "object", properties: { whenProd: { type: "string" } } },
	else: { type: "object", properties: { whenDev: { type: "boolean" } } }
};

// RegExp survives the JSON round-trip as a plain marker object.
const webpack = (options) => {
	fs.writeFileSync(
		process.env.WEBPACK_CLI_TEST_CAPTURE,
		JSON.stringify(options, (key, value) =>
			value instanceof RegExp
				? { source: value.source, flags: value.flags }
				: value
		)
	);
	return { options };
};

// build only calls getArguments(undefined); ignore it and describe our schema.
webpack.cli = {
	getArguments: () => cli.getArguments(schema),
	processArguments: cli.processArguments
};

module.exports = webpack;
