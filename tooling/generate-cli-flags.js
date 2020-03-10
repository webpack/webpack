const fs = require("fs");
const path = require("path");
const prettier = require("prettier");
const schema = require("../schemas/WebpackOptions.json");

const flags = {};

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

function addFlag(schemaPath, schemaPart, multiple) {
	const name = decamelize(schemaPath.replace(/\./g, "-"));
	const types = schemaPart.enum
		? [...new Set(schemaPart.enum.map(item => typeof item))]
		: Array.isArray(schemaPart.type)
		? schemaPart.type
		: [schemaPart.type];

	if (!flags[name]) {
		flags[name] = {
			path: schemaPath,
			description: schemaPart.description,
			types: []
		};
	}

	for (const type of types) {
		const duplicateIndex = flags[name].types.findIndex(() => type === type);

		if (duplicateIndex > -1) {
			if (multiple) {
				flags[name].types[duplicateIndex].multiple = true;
			}

			break;
		}

		flags[name].types.push({ type: type, multiple });
	}
}

const ignoredSchemaPaths = new Set([
	"devServer",
	"module.defaultRules.compiler",
	"module.defaultRules.rules",
	"module.defaultRules.oneOf",
	"module.defaultRules.loader",
	"module.defaultRules.use.loader",
	"module.defaultRules.use.options",
	"module.rules.compiler",
	"module.rules.rules",
	"module.rules.oneOf",
	"module.rules.loader",
	"module.rules.use.loader",
	"module.rules.use.options",
	...["and", "exclude", "include", "not", "or", "test"].reduce(
		(accumulator, currentValue) =>
			accumulator.concat(
				`module.defaultRules.test.${currentValue}`,
				`module.defaultRules.include.${currentValue}`,
				`module.defaultRules.exclude.${currentValue}`,
				`module.defaultRules.issuer.${currentValue}`,
				`module.defaultRules.resource.${currentValue}`,
				`module.defaultRules.resourceQuery.${currentValue}`,
				`module.defaultRules.realResource.${currentValue}`,
				`module.defaultRules.use.${currentValue}`,
				`module.rules.test.${currentValue}`,
				`module.rules.include.${currentValue}`,
				`module.rules.exclude.${currentValue}`,
				`module.rules.issuer.${currentValue}`,
				`module.rules.resource.${currentValue}`,
				`module.rules.resourceQuery.${currentValue}`,
				`module.rules.realResource.${currentValue}`,
				`module.rules.use.${currentValue}`
			),
		[]
	)
]);
const ignoredSchemaRefs = new Set([
	"#/definitions/RuleSetConditionsAbsolute",
	"#/definitions/RuleSetCondition"
]);
const specialSchemaPathNames = {
	"node.__dirname": "node.dirname",
	"node.__filename": "node.filename"
};

// TODO support `not` and `if/then/else`
// TODO support `const`, but we don't use it on our schema
function traverse(schemaPart, schemaPath = "", inArray = false) {
	if (ignoredSchemaPaths.has(schemaPath)) {
		return;
	}

	while (schemaPart.$ref) {
		if (ignoredSchemaRefs.has(schemaPart.$ref)) {
			return;
		}

		schemaPart = getSchemaPart(schemaPart.$ref);
	}

	if (
		!schemaPart.type &&
		!schemaPart.enum &&
		!schemaPart.oneOf &&
		!schemaPart.anyOf &&
		!schemaPart.allOf
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
					schemaPath ? `${schemaPath}.${property}` : property,
					inArray
				)
			);
		}

		return;
	}

	if (schemaPart.type === "array") {
		if (Array.isArray(schemaPart.items)) {
			schemaPart.items.forEach(item => traverse(item, schemaPath, true));

			return;
		}

		traverse(schemaPart.items, schemaPath, true);

		return;
	}

	const maybeOf = schemaPart.oneOf || schemaPart.anyOf || schemaPart.allOf;

	if (maybeOf) {
		const items = maybeOf;

		items.forEach((item, index) => traverse(items[index], schemaPath, inArray));

		return;
	}

	if (specialSchemaPathNames[schemaPath]) {
		schemaPath = specialSchemaPathNames[schemaPath];
	}

	addFlag(schemaPath, schemaPart, inArray);
}

traverse(schema);

const cliFlagsPath = path.resolve(__dirname, "../bin/cli-flags.js");
const prettierConfig = prettier.resolveConfig.sync(cliFlagsPath);

fs.writeFileSync(
	cliFlagsPath,
	prettier.format(
		`/**
 * This file was automatically generated.
 * DO NOT MODIFY BY HAND.
 * Run \`yarn special-lint-fix\` to update
 */\n
  module.exports = ${JSON.stringify(flags, null, 2)};`,
		{
			...prettierConfig,
			parser: "babel"
		}
	)
);
