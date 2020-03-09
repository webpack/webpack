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

	const getDescription = path => {
		for (const { schema } of path) {
			if (schema.cli && schema.cli.helper) continue;
			if (schema.description) return schema.description;
		}
	};

	const addFlag = (path, multiple) => {
		const name = pathToArgumentName(path[0].path);
		const description = getDescription(path);
		const types = getTypesFromSchema(path[0].schema);
		if (types.length === 0) return;

		if (!flags[name]) {
			flags[name] = {
				path: path[0].path,
				description,
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

		if (description) {
			if (flags[name].description) {
				if (!flags[name].description.includes(description)) {
					flags[name].description += ` ${description}`;
				}
			} else {
				flags[name].description = description;
			}
		}
	};

	// TODO support `not` and `if/then/else`
	// TODO support `const`, but we don't use it on our schema
	/**
	 *
	 * @param {object} schemaPart the current schema
	 * @param {string} schemaPath the current path in the schema
	 * @param {{schema: object, path: string}[]} path all previous visisted schemaParts
	 * @param {string | null} inArray if inside of an array, the path to the array
	 */
	const traverse = (schemaPart, schemaPath = "", path = [], inArray = null) => {
		while (schemaPart.$ref) {
			schemaPart = getSchemaPart(schemaPart.$ref);
		}

		const repeations = path.filter(({ schema, path }) => schema === schemaPart);
		if (
			repeations.length >= 2 ||
			repeations.some(({ path }) => path === schemaPath)
		) {
			return;
		}

		if (schemaPart.cli && schemaPart.cli.exclude) return;

		const fullPath = [{ schema: schemaPart, path: schemaPath }, ...path];

		addFlag(fullPath, !!inArray);

		if (schemaPart.type === "object") {
			if (schemaPart.properties) {
				for (const property of Object.keys(schemaPart.properties)) {
					traverse(
						schemaPart.properties[property],
						schemaPath ? `${schemaPath}.${property}` : property,
						fullPath,
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
					traverse(item, schemaPath, fullPath, schemaPath);
				}

				return;
			}

			traverse(schemaPart.items, schemaPath, fullPath, schemaPath);

			return;
		}

		const maybeOf = schemaPart.oneOf || schemaPart.anyOf || schemaPart.allOf;

		if (maybeOf) {
			const items = maybeOf;

			for (let i = 0; i < items.length; i++) {
				traverse(items[i], schemaPath, fullPath, inArray);
			}

			return;
		}
	};

	traverse(schema);

	return flags;
};

exports.getArguments = getArguments;
