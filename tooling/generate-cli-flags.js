const fs = require("fs");
const path = require("path");
const prettier = require("prettier");
const schema = require("../schemas/WebpackOptions");
const prettierConfig = prettier.resolveConfig.sync("./bin/cli-flags.js");

function decamelize(input) {
	return input
		.replace(/([\p{Lowercase_Letter}\d])(\p{Uppercase_Letter})/gu, `$1${"-"}$2`)
		.replace(
			/(\p{Uppercase_Letter}+)(\p{Uppercase_Letter}\p{Lowercase_Letter}+)/gu,
			`$1${"-"}$2`
		)
		.toLowerCase();
}

function getSchemaPart(path) {
	const newPath = path.split("/");

	let schemaPart = schema;

	for (let i = 1; i < newPath.length; i++) {
		const inner = schemaPart[newPath[i]];

		if (!inner) {
			break;
		}

		schemaPart = inner;
	}

	return schemaPart;
}

const flags = {};
const ignoredSchemaPaths = new Set(["devServer"]);

// TODO - not, oneOf, anyOf, allOf, if/then/else
// TODO support `const`, but we don't use it on our schema
function traverse(schemaPart, schemaPath = "") {
	if (ignoredSchemaPaths.has(schemaPath)) {
		return;
	}

	while (schemaPart.$ref) {
		schemaPart = getSchemaPart(schemaPart.$ref);
	}

	if (
		!schemaPart.type &&
		!schemaPart.enum &&
		!schemaPart.oneOf &&
		!schemaPart.anyOf
	) {
		return;
	}

	if (schemaPart.type === "null") {
		return;
	}

	if (schemaPart.type === "object") {
		if (schemaPart.properties) {
			Object.keys(schemaPart.properties).forEach(property =>
				traverse(
					schemaPart.properties[property],
					schemaPath ? `${schemaPath}/${property}` : property
				)
			);
		}

		return;
	}

	if (schemaPart.type === "array") {
		// TODO
		return;
	}

	if (schemaPart.anyOf) {
		const items = schemaPart.oneOf || schemaPart.anyOf;

		items.forEach((item, index) =>
			traverse(schemaPart.anyOf[index], schemaPath)
		);

		return;
	}

	const name = decamelize(schemaPath.replace(/\//g, "-"));
	const types = schemaPart.enum
		? [...new Set(schemaPart.enum.map(item => typeof item))]
		: Array.isArray(schemaPart.type)
		? schemaPart.type
		: [schemaPart.type];

	if (flags[name]) {
		flags[name].types = [...new Set(flags[name].types.concat(types))];

		return;
	}

	flags[name] = { types, description: schemaPart.description };
}

traverse(schema);

fs.writeFileSync(
	path.resolve(__dirname, "../bin/cli-flags.js"),
	prettier.format(`module.exports = ${JSON.stringify(flags, null, 2)};`, {
		...prettierConfig,
		parser: "babel"
	})
);
