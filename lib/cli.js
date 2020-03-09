/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const schema = require("../schemas/WebpackOptions.json");

const getArguments = () => {
	const flags = {};

	const pathToArgumentName = input => {
		return input
			.replace(/\//g, "-")
			.replace(
				/(\p{Uppercase_Letter}+|\p{Lowercase_Letter}|\d)(\p{Uppercase_Letter})/gu,
				"$1-$2"
			)
			.replace(/-?[^\p{Uppercase_Letter}\p{Lowercase_Letter}\d]+/gu, "-")
			.toLowerCase();
	};

	const getSchemaPart = path => {
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
	};

	const getTypesFromSchema = schemaPart => {
		const result = new Set();
		if (schemaPart.enum) {
			for (const value of schemaPart.enum) {
				switch (typeof value) {
					case "string":
						result.add("string");
						break;
					case "boolean":
						result.add("boolean");
						break;
					case "number":
						result.add("number");
						break;
				}
			}
		}
		if (schemaPart.type) {
			const types = new Set(
				Array.isArray(schemaPart.type) ? schemaPart.type : [schemaPart.type]
			);
			if (types.has("number")) {
				result.add("number");
			}
			if (types.has("string")) {
				result.add("string");
			}
			if (types.has("boolean")) {
				result.add("boolean");
			}
		}
		if (schemaPart.instanceof === "RegExp") {
			result.add("string");
		}
		return Array.from(result);
	};

	const getDescription = (schemaPart, path) => {
		const fullPath = [...path, schemaPart];
		for (let i = fullPath.length - 1; i > 0; i--) {
			const part = fullPath[i];
			if (part.cli && part.cli.helper) continue;
			if (part.description) return part.description;
		}
	};

	const addFlag = (schemaPath, schemaPart, path, multiple) => {
		const name = pathToArgumentName(schemaPath);
		const description = getDescription(schemaPart, path);
		const types = getTypesFromSchema(schemaPart);
		if (types.length === 0) return;

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
			description &&
			!flags[name].description.includes(description)
		) {
			flags[name].description += ` ${description}`;
		}
	};

	// TODO support `not` and `if/then/else`
	// TODO support `const`, but we don't use it on our schema
	/**
	 *
	 * @param {object} schemaPart the current schema
	 * @param {string} schemaPath the current path in the schema
	 * @param {object[]} path all previous visisted schemaParts
	 * @param {string | null} inArray if inside of an array, the path to the array
	 */
	const traverse = (schemaPart, schemaPath = "", path = [], inArray = null) => {
		if (path.includes(schemaPart)) {
			return;
		}

		while (schemaPart.$ref) {
			schemaPart = getSchemaPart(schemaPart.$ref);
		}

		if (schemaPart.cli && schemaPart.cli.exclude) return;

		addFlag(schemaPath, schemaPart, path, !!inArray);

		if (schemaPart.type === "object") {
			if (schemaPart.properties) {
				for (const property of Object.keys(schemaPart.properties)) {
					traverse(
						schemaPart.properties[property],
						schemaPath ? `${schemaPath}.${property}` : property,
						[...path, schemaPart],
						inArray
					);
				}
			}

			return;
		}

		if (schemaPart.type === "array") {
			if (inArray) {
				return;
			}
			if (Array.isArray(schemaPart.items)) {
				for (const item of schemaPart.items) {
					traverse(item, schemaPath, [...path, schemaPart], schemaPath);
				}

				return;
			}

			traverse(schemaPart.items, schemaPath, [...path, schemaPart], schemaPath);

			return;
		}

		const maybeOf = schemaPart.oneOf || schemaPart.anyOf || schemaPart.allOf;

		if (maybeOf) {
			const items = maybeOf;

			for (let i = 0; i < items.length; i++) {
				traverse(items[i], schemaPath, [...path, schemaPart], inArray);
			}

			return;
		}
	};

	traverse(schema);

	return flags;
};

exports.getArguments = getArguments;
