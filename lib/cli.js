/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const schema = require("../schemas/WebpackOptions.json");

const getFlags = ({ filter = undefined } = {}) => {
	const flags = {};

	function decamelize(input) {
		return input
			.replace(
				/(\p{Uppercase_Letter}+|\p{Lowercase_Letter}|\d)(\p{Uppercase_Letter})/gu,
				"$1-$2"
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

	const ignoredSchemaPaths = new Set(["devServer"]);
	const specialSchemaPathNames = {
		"node/__dirname": "node/dirname",
		"node/__filename": "node/filename"
	};

	function addFlag(schemaPath, schemaPart, multiple) {
		if (filter && !filter(schemaPath, schemaPart)) return;
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
			const duplicateIndex = flags[name].types.findIndex(
				item => item.type === type
			);

			if (duplicateIndex > -1) {
				if (multiple) {
					flags[name].types[duplicateIndex].multiple = true;
				}

				continue;
			}

			flags[name].types.push({ type, multiple });
		}

		if (
			flags[name].description &&
			schemaPart.description &&
			!flags[name].description.includes(schemaPart.description)
		) {
			flags[name].description += ` ${schemaPart.description}`;
		}
	}

	// TODO support `not` and `if/then/else`
	// TODO support `const`, but we don't use it on our schema
	function traverse(schemaPart, schemaPath = "", depth = 0, inArray = false) {
		if (ignoredSchemaPaths.has(schemaPath)) {
			return;
		}

		if (depth === 10) {
			return;
		}

		while (schemaPart.$ref) {
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
						depth + 1
					)
				);
			}

			return;
		}

		if (schemaPart.type === "array") {
			if (Array.isArray(schemaPart.items)) {
				schemaPart.items.forEach(item => {
					traverse(item, schemaPath, depth + 1, true);
				});

				return;
			}

			traverse(schemaPart.items, schemaPath, depth + 1, true);

			return;
		}

		const maybeOf = schemaPart.oneOf || schemaPart.anyOf || schemaPart.allOf;

		if (maybeOf) {
			const items = maybeOf;

			items.forEach((item, index) =>
				traverse(items[index], schemaPath, depth + 1)
			);

			return;
		}

		if (specialSchemaPathNames[schemaPath]) {
			schemaPath = specialSchemaPathNames[schemaPath];
		}

		addFlag(schemaPath, schemaPart, inArray);
	}

	traverse(schema);

	return flags;
};

exports.getFlags = getFlags;
