/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const schema = require("../schemas/WebpackOptions.json");

// TODO add originPath to PathItem for better errors
/**
 * @typedef {Object} PathItem
 * @property {any} schema the part of the schema
 * @property {string} path the path in the config
 */

/**
 * @typedef {Object} Problem
 * @property {string} type
 * @property {string} path
 * @property {string=} argument
 */

/**
 * @typedef {Object} Argument
 * @property {string} description
 * @property {string} path
 * @property {{type: string, multiple: boolean}[]} types
 * @property {function(any, any, number | undefined)[]} handlers
 */

/**
 * @returns {Record<string, Argument>} object of arguments
 */
const getArguments = () => {
	/** @type {Record<string, Argument>} */
	const flags = {};

	const pathToArgumentName = input => {
		return input
			.replace(/\./g, "-")
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

	/**
	 * @param {any} schemaPart part of the schema
	 * @returns {string[]} types
	 */
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
		switch (schemaPart.type) {
			case "number":
				result.add("number");
				break;
			case "string":
				result.add("string");
				break;
			case "boolean":
				result.add("boolean");
				break;
		}
		if (schemaPart.instanceof === "RegExp") {
			result.add("string");
		}
		return Array.from(result);
	};

	/**
	 *
	 * @param {PathItem[]} path path in the schema
	 * @returns {string | undefined} description
	 */
	const getDescription = path => {
		for (const { schema } of path) {
			if (schema.cli && schema.cli.helper) continue;
			if (schema.description) return schema.description;
		}
	};

	/**
	 *
	 * @param {any} schemaPart part of the schema
	 * @param {string | boolean | number | RegExp} value value from cli argument
	 * @returns {any} parsed value
	 */
	const parseValueForSchema = (schemaPart, value) => {
		if (schemaPart.enum) {
			if (schemaPart.enum.includes(value)) return value;
		}
		switch (schemaPart.type) {
			case "number":
				if (typeof value === "number") return value;
				if (typeof value === "string" && /^[+-]?\d*(\.\d*)[eE]\d+$/) {
					const n = +value;
					if (!isNaN(n)) return value;
				}
				break;
			case "string":
				if (typeof value === "string") {
					if (schemaPart.absolutePath) value = path.resolve(value);
					return value;
				}
				break;
			case "boolean":
				if (typeof value === "boolean") return value;
				if (value === "true") return true;
				if (value === "false") return false;
				break;
		}
		if (schemaPart.instanceof === "RegExp") {
			if (value instanceof RegExp) return value;
			if (typeof value === "string") {
				const match = /^\/(.*)\/([iguy]*)$/.exec(value);
				if (match && !/[^/]\//.test(match[1]))
					return new RegExp(match[1], match[2]);
			}
		}
	};

	const cliAddedItems = new WeakMap();

	/**
	 * @param {any} config configuration
	 * @param {string} schemaPath path in the config
	 * @param {number | undefined} index index of value when multiple values are provided, otherwise undefined
	 * @returns {{ problem?: Problem, object?: any, property?: string | number, value?: any }} problem or object with property and value
	 */
	const getObjectAndProperty = (config, schemaPath, index) => {
		if (!schemaPath) return { value: config };
		const parts = schemaPath.split(".");
		let property = parts.pop();
		let current = config;
		let i = 0;
		for (const part of parts) {
			if (current !== null && typeof current === "object") {
				current = current[part];
			} else {
				return {
					problem: {
						type: "non-object",
						path: parts.slice(0, i).join("/")
					}
				};
			}
			i++;
			if (Array.isArray(current)) {
				if (index === undefined) {
					return {
						problem: {
							type: "array",
							path: parts.slice(0, i).join("/")
						}
					};
				}
				let addedItems = cliAddedItems.get(current) || 0;
				while (addedItems <= index) {
					current.push({});
					addedItems++;
				}
				cliAddedItems.set(current, addedItems);
				current = current[current.length - addedItems + index];
			}
		}
		if (current === null || typeof current !== "object") {
			return {
				problem: {
					type: "non-object",
					path: schemaPath
				}
			};
		}
		const value = current[property];
		return { object: current, property, value };
	};

	/**
	 * @param {any} config configuration
	 * @param {string} schemaPath path in the config
	 * @param {any} schemaPart part of the schema
	 * @param {number | undefined} index index of value when multiple values are provided, otherwise undefined
	 * @returns {Problem | null} problem or null for success
	 */
	const ensureForm = (config, schemaPath, schemaPart, index) => {
		const { problem, object, property, value } = getObjectAndProperty(
			config,
			schemaPath,
			index
		);
		if (problem) return problem;

		if (schemaPart.type === "object") {
			if (value === undefined) {
				object[property] = {};
				return null;
			}
			if (value && typeof value === "object" && !Array.isArray(value)) {
				return null;
			}
			return {
				type: "non-object",
				path: schemaPath
			};
		}
		if (schemaPart.type === "array") {
			if (value === undefined) {
				object[property] = [];
				return null;
			}
			if (Array.isArray(value)) {
				return null;
			}
			object[property] = [value];
			return null;
		}
		return null;
	};

	/**
	 * @param {any} config configuration
	 * @param {string} schemaPath path in the config
	 * @param {string | boolean | number | RegExp} value value from cli argument
	 * @param {number | undefined} index index of value when multiple values are provided, otherwise undefined
	 * @returns {Problem | null} problem or null for success
	 */
	const setValue = (config, schemaPath, value, index) => {
		const { problem, object, property, value: oldValue } = getObjectAndProperty(
			config,
			schemaPath,
			index
		);
		if (problem) return problem;
		if (Array.isArray(oldValue)) {
			if (index === undefined) {
				index = 0;
			}
			let addedItems = cliAddedItems.get(oldValue) || 0;
			while (addedItems <= index) {
				oldValue.push({});
				addedItems++;
			}
			cliAddedItems.set(oldValue, addedItems);
			oldValue[oldValue.length - addedItems + index] = value;
			return null;
		}
		if (object === null || typeof object !== "object") {
			return {
				type: "non-object",
				path: schemaPath
			};
		}
		object[property] = value;
		return null;
	};

	/**
	 * @param {PathItem[]} path path in the schema
	 * @returns {void}
	 */
	const addResetFlag = path => {
		const schemaPath = `${path[0].path}.reset`;
		const name = pathToArgumentName(schemaPath);
		const description = getDescription(path);
		flags[name] = {
			types: [{ type: "boolean", multiple: false }],
			path: schemaPath,
			description: `Clear all items provided in configuration. ${description}`,
			handlers: [
				(config, value, index) => {
					if (!value) return;
					for (let i = path.length - 1; i > 0; i--) {
						const problem = ensureForm(
							config,
							path[i].path,
							path[i].schema,
							undefined
						);
						if (problem) return problem;
					}
					return setValue(config, path[0].path, undefined, undefined);
				}
			]
		};
	};

	/**
	 * @param {PathItem[]} path full path in schema
	 * @param {boolean} multiple inside of an array
	 * @returns {number} number of arguments added
	 */
	const addFlag = (path, multiple) => {
		const name = pathToArgumentName(path[0].path);
		const description = getDescription(path);
		const types = getTypesFromSchema(path[0].schema);
		if (types.length === 0) return 0;

		if (!flags[name]) {
			flags[name] = {
				path: path[0].path,
				description,
				types: [],
				handlers: []
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

		flags[name].handlers.push((config, value, index) => {
			if (index !== undefined && !multiple) {
				return {
					type: "non-multiple",
					path: path[0].path
				};
			}
			const finalValue = parseValueForSchema(path[0].schema, value);
			if (finalValue === undefined) {
				return {
					type: "non-parsable",
					path: path[0].path
				};
			}
			for (let i = path.length - 1; i > 0; i--) {
				const problem = ensureForm(config, path[i].path, path[i].schema, index);
				if (problem) return problem;
			}
			return setValue(config, path[0].path, finalValue, index);
		});

		return 1;
	};

	// TODO support `not` and `if/then/else`
	// TODO support `const`, but we don't use it on our schema
	/**
	 *
	 * @param {object} schemaPart the current schema
	 * @param {string} schemaPath the current path in the schema
	 * @param {{schema: object, path: string}[]} path all previous visisted schemaParts
	 * @param {string | null} inArray if inside of an array, the path to the array
	 * @returns {number} added arguments
	 */
	const traverse = (schemaPart, schemaPath = "", path = [], inArray = null) => {
		while (schemaPart.$ref) {
			schemaPart = getSchemaPart(schemaPart.$ref);
		}

		const repeations = path.filter(({ schema }) => schema === schemaPart);
		if (
			repeations.length >= 2 ||
			repeations.some(({ path }) => path === schemaPath)
		) {
			return 0;
		}

		if (schemaPart.cli && schemaPart.cli.exclude) return 0;

		const fullPath = [{ schema: schemaPart, path: schemaPath }, ...path];

		let addedArguments = 0;

		addedArguments += addFlag(fullPath, !!inArray);

		if (schemaPart.type === "object") {
			if (schemaPart.properties) {
				for (const property of Object.keys(schemaPart.properties)) {
					addedArguments += traverse(
						schemaPart.properties[property],
						schemaPath ? `${schemaPath}.${property}` : property,
						fullPath,
						inArray
					);
				}
			}

			return addedArguments;
		}

		if (schemaPart.type === "array") {
			if (inArray) {
				return 0;
			}
			if (Array.isArray(schemaPart.items)) {
				let i = 0;
				for (const item of schemaPart.items) {
					addedArguments += traverse(
						item,
						`${schemaPath}.${i}`,
						fullPath,
						schemaPath
					);
				}

				return addedArguments;
			}

			addedArguments += traverse(
				schemaPart.items,
				schemaPath,
				fullPath,
				schemaPath
			);

			if (
				addedArguments > 0 &&
				(!schemaPart.cli || !schemaPart.cli.overwrite)
			) {
				addResetFlag(fullPath);
				addedArguments++;
			}

			return addedArguments;
		}

		const maybeOf = schemaPart.oneOf || schemaPart.anyOf || schemaPart.allOf;

		if (maybeOf) {
			const items = maybeOf;

			for (let i = 0; i < items.length; i++) {
				addedArguments += traverse(items[i], schemaPath, fullPath, inArray);
			}

			return addedArguments;
		}

		return addedArguments;
	};

	traverse(schema);

	return flags;
};

/**
 * @param {Record<string, Argument>} args object of arguments
 * @param {any} config configuration
 * @param {Record<string, string | number | boolean | RegExp>} values object with values
 * @returns {Problem[] | null} problems or null for success
 */
const processArguments = (args, config, values) => {
	/** @type {Problem[]} */
	const problems = [];
	for (const key of Object.keys(values)) {
		const arg = args[key];
		if (!arg) {
			problems.push({
				type: "unknown",
				path: "",
				argument: key
			});
			continue;
		}
		const runHandlers = (value, i) => {
			const currentProblems = [];
			for (const handler of arg.handlers) {
				const problem = handler(config, value, i);
				if (!problem) {
					return;
				}
				problem.argument = key;
				problem.value = value;
				problem.index = i;
				currentProblems.push(problem);
			}
			problems.push(...currentProblems);
		};
		let value = values[key];
		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				runHandlers(value[i], i);
			}
		} else {
			runHandlers(value, undefined);
		}

		if (problems.length === 0) return null;
		return problems;
	}
};

exports.getArguments = getArguments;
exports.processArguments = processArguments;
