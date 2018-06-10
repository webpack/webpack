/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
/** @typedef {import("./Module")} Module */
/** @typedef {import("./Chunk")} Chunk */
/** @typedef {import("./ModuleTemplate")} ModuleTemplate */
/** @typedef {import("webpack-sources").ConcatSource} ConcatSource */

const { ConcatSource } = require("webpack-sources");
const HotUpdateChunk = require("./HotUpdateChunk");

const START_LOWERCASE_ALPHABET_CODE = "a".charCodeAt(0);
const START_UPPERCASE_ALPHABET_CODE = "A".charCodeAt(0);
const DELTA_A_TO_Z = "z".charCodeAt(0) - START_LOWERCASE_ALPHABET_CODE + 1;
const FUNCTION_CONTENT_REGEX = /^function\s?\(\)\s?\{\r?\n?|\r?\n?\}$/g;
const INDENT_MULTILINE_REGEX = /^\t/gm;
const LINE_SEPARATOR_REGEX = /\r?\n/g;
const IDENTIFIER_NAME_REPLACE_REGEX = /^([^a-zA-Z$_])/;
const IDENTIFIER_ALPHA_NUMERIC_NAME_REPLACE_REGEX = /[^a-zA-Z0-9$]+/g;
const COMMENT_END_REGEX = /\*\//g;
const PATH_NAME_NORMALIZE_REPLACE_REGEX = /[^a-zA-Z0-9_!§$()=\-^°]+/g;
const MATCH_PADDED_HYPHENS_REPLACE_REGEX = /^-|-$/g;

/**
 * @typedef {Object} HasId
 * @property {number} id
 * */

/**
 * @typedef {(m: Module, idx: number) => boolean} ModuleFilterPredicate
 */

/**
 * @param {HasId} a first id object to be sorted
 * @param {HasId} b second id object to be sorted against
 * @returns {-1|0|1} the sort value
 */
const stringifyIdSortPredicate = (a, b) => {
	var aId = a.id + "";
	var bId = b.id + "";
	if (aId < bId) return -1;
	if (aId > bId) return 1;
	return 0;
};

/**
 * @param {Module} module the module to compare against
 * @returns {boolean} return true if module.id is equal to type "number"
 */
const moduleIdIsNumber = module => {
	return typeof module.id === "number";
};

class Template {
	/**
	 *
	 * @param {Function} fn - a runtime function (.runtime.js) "template"
	 * @returns {string} the updated and normalized function string
	 */
	static getFunctionContent(fn) {
		return fn
			.toString()
			.replace(FUNCTION_CONTENT_REGEX, "")
			.replace(INDENT_MULTILINE_REGEX, "")
			.replace(LINE_SEPARATOR_REGEX, "\n");
	}
	/**
	 * @param {string} str the string converted to identifier
	 * @returns {string} created identifier
	 */
	static toIdentifier(str) {
		if (typeof str !== "string") return "";
		return str
			.replace(IDENTIFIER_NAME_REPLACE_REGEX, "_$1")
			.replace(IDENTIFIER_ALPHA_NUMERIC_NAME_REPLACE_REGEX, "_");
	}
	/**
	 *
	 * @param {string} str string to be converted to commented in bundle code
	 * @returns {string} returns a commented version of string
	 */
	static toComment(str) {
		if (!str) return "";
		return `/*! ${str.replace(COMMENT_END_REGEX, "* /")} */`;
	}

	/**
	 *
	 * @param {string} str string to be converted to "normal comment"
	 * @returns {string} returns a commented version of string
	 */
	static toNormalComment(str) {
		if (!str) return "";
		return `/* ${str.replace(COMMENT_END_REGEX, "* /")} */`;
	}

	/**
	 * @param {string} str string path to be normalized
	 * @returns {string} normalized bundle-safe path
	 */
	static toPath(str) {
		if (typeof str !== "string") return "";
		return str
			.replace(PATH_NAME_NORMALIZE_REPLACE_REGEX, "-")
			.replace(MATCH_PADDED_HYPHENS_REPLACE_REGEX, "");
	}

	// map number to a single character a-z, A-Z or <_ + number> if number is too big
	/**
	 *
	 * @param {number} n number to convert to ident
	 * @returns {string} returns single character ident
	 */
	static numberToIdentifer(n) {
		// lower case
		if (n < DELTA_A_TO_Z) {
			return String.fromCharCode(START_LOWERCASE_ALPHABET_CODE + n);
		}

		// upper case
		if (n < DELTA_A_TO_Z * 2) {
			return String.fromCharCode(
				START_UPPERCASE_ALPHABET_CODE + n - DELTA_A_TO_Z
			);
		}

		// use multiple letters
		return (
			Template.numberToIdentifer(n % (2 * DELTA_A_TO_Z)) +
			Template.numberToIdentifer(Math.floor(n / (2 * DELTA_A_TO_Z)))
		);
	}

	/**
	 *
	 * @param {string | string[]} str string to convert to identity
	 * @returns {string} converted identity
	 */
	static indent(str) {
		if (Array.isArray(str)) {
			return str.map(Template.indent).join("\n");
		} else {
			str = str.trimRight();
			if (!str) return "";
			var ind = str[0] === "\n" ? "" : "\t";
			return ind + str.replace(/\n([^\n])/g, "\n\t$1");
		}
	}

	/**
	 *
	 * @param {string|string[]} str string to create prefix for
	 * @param {string} prefix prefix to compose
	 * @returns {string} returns new prefix string
	 */
	static prefix(str, prefix) {
		if (Array.isArray(str)) {
			str = str.join("\n");
		}
		str = str.trim();
		if (!str) return "";
		const ind = str[0] === "\n" ? "" : prefix;
		return ind + str.replace(/\n([^\n])/g, "\n" + prefix + "$1");
	}

	/**
	 *
	 * @param {string|string[]} str string or string collection
	 * @returns {string} returns a single string from array
	 */
	static asString(str) {
		if (Array.isArray(str)) {
			return str.join("\n");
		}
		return str;
	}

	/**
	 *
	 * @param {Module[]} modules a collection of modules to get array bounds for
	 * @returns {[number, number] | false} returns the upper and lower array bounds
	 * or false if not every module has a number based id
	 */
	static getModulesArrayBounds(modules) {
		// Typeguards don't work for .every() with predicate functions
		// https://github.com/Microsoft/TypeScript/issues/23799
		if (!modules.every(moduleIdIsNumber)) return false;
		var maxId = -Infinity;
		var minId = Infinity;
		for (const module of modules) {
			if (maxId < module.id) maxId = /** @type {number} */ (module.id);
			if (minId > module.id) minId = /** @type {number} */ (module.id);
		}
		if (minId < 16 + ("" + minId).length) {
			// add minId x ',' instead of 'Array(minId).concat(…)'
			minId = 0;
		}
		var objectOverhead = modules
			.map(module => {
				var idLength = (module.id + "").length;
				return idLength + 2;
			})
			.reduce((a, b) => {
				return a + b;
			}, -1);
		var arrayOverhead = minId === 0 ? maxId : 16 + ("" + minId).length + maxId;
		return arrayOverhead < objectOverhead ? [minId, maxId] : false;
	}

	/**
	 * @param {Chunk} chunk chunk whose modules will be rendered
	 * @param {ModuleFilterPredicate} filterFn function used to filter modules from chunk to render
	 * @param {ModuleTemplate} moduleTemplate ModuleTemplate instance used to render modules
	 * @param {TODO | TODO[]} dependencyTemplates templates needed for each module to render dependencies
	 * @param {string=} prefix applying prefix strings
	 * @returns {ConcatSource} rendered chunk modules in a Source object
	 */
	static renderChunkModules(
		chunk,
		filterFn,
		moduleTemplate,
		dependencyTemplates,
		prefix
	) {
		if (!prefix) prefix = "";
		var source = new ConcatSource();
		const modules = chunk.getModules().filter(filterFn);
		if (chunk instanceof HotUpdateChunk) {
			var removedModules = chunk.removedModules;
		}
		if (
			modules.length === 0 &&
			(!removedModules || removedModules.length === 0)
		) {
			source.add("[]");
			return source;
		}
		var allModules = modules.map(module => {
			return {
				id: module.id,
				source: moduleTemplate.render(module, dependencyTemplates, {
					chunk
				})
			};
		});
		if (removedModules && removedModules.length > 0) {
			for (const id of removedModules) {
				allModules.push({
					id: id,
					source: "false"
				});
			}
		}
		var bounds = Template.getModulesArrayBounds(allModules);

		if (bounds) {
			// Render a spare array
			var minId = bounds[0];
			var maxId = bounds[1];
			if (minId !== 0) source.add("Array(" + minId + ").concat(");
			source.add("[\n");
			const modules = new Map();
			for (const module of allModules) {
				modules.set(module.id, module);
			}
			for (var idx = minId; idx <= maxId; idx++) {
				var module = modules.get(idx);
				if (idx !== minId) source.add(",\n");
				source.add("/* " + idx + " */");
				if (module) {
					source.add("\n");
					source.add(module.source);
				}
			}
			source.add("\n" + prefix + "]");
			if (minId !== 0) source.add(")");
		} else {
			// Render an object
			source.add("{\n");
			allModules.sort(stringifyIdSortPredicate).forEach((module, idx) => {
				if (idx !== 0) source.add(",\n");
				source.add(`\n/***/ ${JSON.stringify(module.id)}:\n`);
				source.add(module.source);
			});
			source.add("\n\n" + prefix + "}");
		}
		return source;
	}
}

module.exports = Template;
