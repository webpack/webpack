/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const path = require("path");
const webpackSchema = require("../schemas/WebpackOptions.json");

// TODO add originPath to PathItem for better errors
/**
 * @typedef {Object} PathItem
 * @property {any} schema the part of the schema
 * @property {string} path the path in the config
 */

/** @typedef {"unknown-argument" | "unexpected-non-array-in-path" | "unexpected-non-object-in-path" | "multiple-values-unexpected" | "invalid-value"} ProblemType */

/**
 * @typedef {Object} Problem
 * @property {ProblemType} type
 * @property {string} path
 * @property {string} argument
 * @property {any=} value
 * @property {number=} index
 * @property {string=} expected
 */

/**
 * @typedef {Object} LocalProblem
 * @property {ProblemType} type
 * @property {string} path
 * @property {string=} expected
 */

/**
 * @typedef {Object} ArgumentConfig
 * @property {string} description
 * @property {string} path
 * @property {boolean} multiple
 * @property {"enum"|"string"|"path"|"number"|"boolean"|"RegExp"|"reset"} type
 * @property {any[]=} values
 */

/**
 * @typedef {Object} Argument
 * @property {string} description
 * @property {"string"|"number"|"boolean"} simpleType
 * @property {boolean} multiple
 * @property {ArgumentConfig[]} configs
 */

/**
 * @param {any=} schema a json schema to create arguments for (by default webpack schema is used)
 * @returns {Record<string, Argument>} object of arguments
 */
const getArguments = (schema = webpackSchema) => {
	/** @type {Record<string, Argument>} */
	const flags = {};

	const pathToArgumentName = input => {
		return input
			.replace(/\./g, "-")
			.replace(/\[\]/g, "")
			.replace(
				/(\p{Uppercase_Letter}+|\p{Lowercase_Letter}|\d)(\p{Uppercase_Letter}+)/gu,
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
	 * @param {any} schemaPart schema
	 * @returns {Pick<ArgumentConfig, "type"|"values">} partial argument config
	 */
	const schemaToArgumentConfig = schemaPart => {
		if (schemaPart.enum) {
			return {
				type: "enum",
				values: schemaPart.enum
			};
		}
		switch (schemaPart.type) {
			case "number":
				return {
					type: "number"
				};
			case "string":
				return {
					type: schemaPart.absolutePath ? "path" : "string"
				};
			case "boolean":
				return {
					type: "boolean"
				};
		}
		if (schemaPart.instanceof === "RegExp") {
			return {
				type: "RegExp"
			};
		}
		return undefined;
	};

	/**
	 * @param {PathItem[]} path path in the schema
	 * @returns {void}
	 */
	const addResetFlag = path => {
		const schemaPath = path[0].path;
		const name = pathToArgumentName(`${schemaPath}.reset`);
		const description = getDescription(path);
		flags[name] = {
			configs: [
				{
					type: "reset",
					multiple: false,
					description: `Clear all items provided in '${schemaPath}' configuration. ${description}`,
					path: schemaPath
				}
			],
			description: undefined,
			simpleType: undefined,
			multiple: undefined
		};
	};

	/**
	 * @param {PathItem[]} path full path in schema
	 * @param {boolean} multiple inside of an array
	 * @returns {number} number of arguments added
	 */
	const addFlag = (path, multiple) => {
		const argConfigBase = schemaToArgumentConfig(path[0].schema);
		if (!argConfigBase) return 0;

		const name = pathToArgumentName(path[0].path);
		/** @type {ArgumentConfig} */
		const argConfig = {
			...argConfigBase,
			multiple,
			description: getDescription(path),
			path: path[0].path
		};

		if (!flags[name]) {
			flags[name] = {
				configs: [],
				description: undefined,
				simpleType: undefined,
				multiple: undefined
			};
		}

		if (
			flags[name].configs.some(
				item => JSON.stringify(item) === JSON.stringify(argConfig)
			)
		) {
			return 0;
		}

		if (
			flags[name].configs.some(
				item => item.type === argConfig.type && item.multiple !== multiple
			)
		) {
			if (multiple) {
				throw new Error(
					`Conflicting schema for ${path[0].path} with ${argConfig.type} type (array type must be before single item type)`
				);
			}
			return 0;
		}

		flags[name].configs.push(argConfig);

		return 1;
	};

	// TODO support `not` and `if/then/else`
	// TODO support `const`, but we don't use it on our schema
	/**
	 *
	 * @param {object} schemaPart the current schema
	 * @param {string} schemaPath the current path in the schema
	 * @param {{schema: object, path: string}[]} path all previous visited schemaParts
	 * @param {string | null} inArray if inside of an array, the path to the array
	 * @returns {number} added arguments
	 */
	const traverse = (schemaPart, schemaPath = "", path = [], inArray = null) => {
		while (schemaPart.$ref) {
			schemaPart = getSchemaPart(schemaPart.$ref);
		}

		const repetitions = path.filter(({ schema }) => schema === schemaPart);
		if (
			repetitions.length >= 2 ||
			repetitions.some(({ path }) => path === schemaPath)
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
				`${schemaPath}[]`,
				fullPath,
				schemaPath
			);

			if (addedArguments > 0) {
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

	// Summarize flags
	for (const name of Object.keys(flags)) {
		const argument = flags[name];
		argument.description = argument.configs.reduce((desc, { description }) => {
			if (!desc) return description;
			if (!description) return desc;
			if (desc.includes(description)) return desc;
			return `${desc} ${description}`;
		}, /** @type {string | undefined} */ (undefined));
		argument.simpleType = argument.configs.reduce((t, argConfig) => {
			/** @type {"string" | "number" | "boolean"} */
			let type = "string";
			switch (argConfig.type) {
				case "number":
					type = "number";
					break;
				case "reset":
				case "boolean":
					type = "boolean";
					break;
				case "enum":
					if (argConfig.values.every(v => typeof v === "boolean"))
						type = "boolean";
					if (argConfig.values.every(v => typeof v === "number"))
						type = "number";
					break;
			}
			if (t === undefined) return type;
			return t === type ? t : "string";
		}, /** @type {"string" | "number" | "boolean" | undefined} */ (undefined));
		argument.multiple = argument.configs.some(c => c.multiple);
	}

	return flags;
};

const cliAddedItems = new WeakMap();

/**
 * @param {any} config configuration
 * @param {string} schemaPath path in the config
 * @param {number | undefined} index index of value when multiple values are provided, otherwise undefined
 * @returns {{ problem?: LocalProblem, object?: any, property?: string | number, value?: any }} problem or object with property and value
 */
const getObjectAndProperty = (config, schemaPath, index = 0) => {
	if (!schemaPath) return { value: config };
	const parts = schemaPath.split(".");
	let property = parts.pop();
	let current = config;
	let i = 0;
	for (const part of parts) {
		const isArray = part.endsWith("[]");
		const name = isArray ? part.slice(0, -2) : part;
		let value = current[name];
		if (isArray) {
			if (value === undefined) {
				value = {};
				current[name] = [...Array.from({ length: index }), value];
				cliAddedItems.set(current[name], index + 1);
			} else if (!Array.isArray(value)) {
				return {
					problem: {
						type: "unexpected-non-array-in-path",
						path: parts.slice(0, i).join(".")
					}
				};
			} else {
				let addedItems = cliAddedItems.get(value) || 0;
				while (addedItems <= index) {
					value.push(undefined);
					addedItems++;
				}
				cliAddedItems.set(value, addedItems);
				const x = value.length - addedItems + index;
				if (value[x] === undefined) {
					value[x] = {};
				} else if (value[x] === null || typeof value[x] !== "object") {
					return {
						problem: {
							type: "unexpected-non-object-in-path",
							path: parts.slice(0, i).join(".")
						}
					};
				}
				value = value[x];
			}
		} else {
			if (value === undefined) {
				value = current[name] = {};
			} else if (value === null || typeof value !== "object") {
				return {
					problem: {
						type: "unexpected-non-object-in-path",
						path: parts.slice(0, i).join(".")
					}
				};
			}
		}
		current = value;
		i++;
	}
	let value = current[property];
	if (property.endsWith("[]")) {
		const name = property.slice(0, -2);
		const value = current[name];
		if (value === undefined) {
			current[name] = [...Array.from({ length: index }), undefined];
			cliAddedItems.set(current[name], index + 1);
			return { object: current[name], property: index, value: undefined };
		} else if (!Array.isArray(value)) {
			current[name] = [value, ...Array.from({ length: index }), undefined];
			cliAddedItems.set(current[name], index + 1);
			return { object: current[name], property: index + 1, value: undefined };
		} else {
			let addedItems = cliAddedItems.get(value) || 0;
			while (addedItems <= index) {
				value.push(undefined);
				addedItems++;
			}
			cliAddedItems.set(value, addedItems);
			const x = value.length - addedItems + index;
			if (value[x] === undefined) {
				value[x] = {};
			} else if (value[x] === null || typeof value[x] !== "object") {
				return {
					problem: {
						type: "unexpected-non-object-in-path",
						path: schemaPath
					}
				};
			}
			return {
				object: value,
				property: x,
				value: value[x]
			};
		}
	}
	return { object: current, property, value };
};

/**
 * @param {any} config configuration
 * @param {string} schemaPath path in the config
 * @param {any} value parsed value
 * @param {number | undefined} index index of value when multiple values are provided, otherwise undefined
 * @returns {LocalProblem | null} problem or null for success
 */
const setValue = (config, schemaPath, value, index) => {
	const { problem, object, property } = getObjectAndProperty(
		config,
		schemaPath,
		index
	);
	if (problem) return problem;
	object[property] = value;
	return null;
};

/**
 * @param {ArgumentConfig} argConfig processing instructions
 * @param {any} config configuration
 * @param {any} value the value
 * @param {number | undefined} index the index if multiple values provided
 * @returns {LocalProblem | null} a problem if any
 */
const processArgumentConfig = (argConfig, config, value, index) => {
	if (index !== undefined && !argConfig.multiple) {
		return {
			type: "multiple-values-unexpected",
			path: argConfig.path
		};
	}
	const parsed = parseValueForArgumentConfig(argConfig, value);
	if (parsed === undefined) {
		return {
			type: "invalid-value",
			path: argConfig.path,
			expected: getExpectedValue(argConfig)
		};
	}
	const problem = setValue(config, argConfig.path, parsed, index);
	if (problem) return problem;
	return null;
};

/**
 * @param {ArgumentConfig} argConfig processing instructions
 * @returns {string | undefined} expected message
 */
const getExpectedValue = argConfig => {
	switch (argConfig.type) {
		default:
			return argConfig.type;
		case "boolean":
			return "true | false";
		case "RegExp":
			return "regular expression (example: /ab?c*/)";
		case "enum":
			return argConfig.values.map(v => `${v}`).join(" | ");
		case "reset":
			return "true (will reset the previous value to an empty array)";
	}
};

/**
 * @param {ArgumentConfig} argConfig processing instructions
 * @param {any} value the value
 * @returns {any | undefined} parsed value
 */
const parseValueForArgumentConfig = (argConfig, value) => {
	switch (argConfig.type) {
		case "string":
			if (typeof value === "string") {
				return value;
			}
			break;
		case "path":
			if (typeof value === "string") {
				return path.resolve(value);
			}
			break;
		case "number":
			if (typeof value === "number") return value;
			if (typeof value === "string" && /^[+-]?\d*(\.\d*)[eE]\d+$/) {
				const n = +value;
				if (!isNaN(n)) return n;
			}
			break;
		case "boolean":
			if (typeof value === "boolean") return value;
			if (value === "true") return true;
			if (value === "false") return false;
			break;
		case "RegExp":
			if (value instanceof RegExp) return value;
			if (typeof value === "string") {
				// cspell:word yugi
				const match = /^\/(.*)\/([yugi]*)$/.exec(value);
				if (match && !/[^\\]\//.test(match[1]))
					return new RegExp(match[1], match[2]);
			}
			break;
		case "enum":
			if (argConfig.values.includes(value)) return value;
			for (const item of argConfig.values) {
				if (`${item}` === value) return item;
			}
			break;
		case "reset":
			if (value === true) return [];
			break;
	}
};

/**
 * @param {Record<string, Argument>} args object of arguments
 * @param {any} config configuration
 * @param {Record<string, string | number | boolean | RegExp | (string | number | boolean | RegExp)[]>} values object with values
 * @returns {Problem[] | null} problems or null for success
 */
const processArguments = (args, config, values) => {
	/** @type {Problem[]} */
	const problems = [];
	for (const key of Object.keys(values)) {
		const arg = args[key];
		if (!arg) {
			problems.push({
				type: "unknown-argument",
				path: "",
				argument: key
			});
			continue;
		}
		const processValue = (value, i) => {
			const currentProblems = [];
			for (const argConfig of arg.configs) {
				const problem = processArgumentConfig(argConfig, config, value, i);
				if (!problem) {
					return;
				}
				currentProblems.push({
					...problem,
					argument: key,
					value: value,
					index: i
				});
			}
			problems.push(...currentProblems);
		};
		let value = values[key];
		if (Array.isArray(value)) {
			for (let i = 0; i < value.length; i++) {
				processValue(value[i], i);
			}
		} else {
			processValue(value, undefined);
		}
	}
	if (problems.length === 0) return null;
	return problems;
};

exports.getArguments = getArguments;
exports.processArguments = processArguments;
