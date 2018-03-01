/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConcatSource = require("webpack-sources").ConcatSource;

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

const stringifyIdSortPredicate = (a, b) => {
	var aId = a.id + "";
	var bId = b.id + "";
	if (aId < bId) return -1;
	if (aId > bId) return 1;
	return 0;
};

const moduleIdIsNumber = module => {
	return typeof module.id === "number";
};

module.exports = class Template {
	static getFunctionContent(fn) {
		return fn
			.toString()
			.replace(FUNCTION_CONTENT_REGEX, "")
			.replace(INDENT_MULTILINE_REGEX, "")
			.replace(LINE_SEPARATOR_REGEX, "\n");
	}

	static toIdentifier(str) {
		if (typeof str !== "string") return "";
		return str
			.replace(IDENTIFIER_NAME_REPLACE_REGEX, "_$1")
			.replace(IDENTIFIER_ALPHA_NUMERIC_NAME_REPLACE_REGEX, "_");
	}

	static toComment(str) {
		if (!str) return "";
		return `/*! ${str.replace(COMMENT_END_REGEX, "* /")} */`;
	}

	static toNormalComment(str) {
		if (!str) return "";
		return `/* ${str.replace(COMMENT_END_REGEX, "* /")} */`;
	}

	static toPath(str) {
		if (typeof str !== "string") return "";
		return str
			.replace(PATH_NAME_NORMALIZE_REPLACE_REGEX, "-")
			.replace(MATCH_PADDED_HYPHENS_REPLACE_REGEX, "");
	}

	// map number to a single character a-z, A-Z or <_ + number> if number is too big
	static numberToIdentifer(n) {
		// lower case
		if (n < DELTA_A_TO_Z)
			return String.fromCharCode(START_LOWERCASE_ALPHABET_CODE + n);

		// upper case
		n -= DELTA_A_TO_Z;
		if (n < DELTA_A_TO_Z)
			return String.fromCharCode(START_UPPERCASE_ALPHABET_CODE + n);

		// use multiple letters
		return (
			Template.numberToIdentifer(n % (2 * DELTA_A_TO_Z)) +
			Template.numberToIdentifer(Math.floor(n / (2 * DELTA_A_TO_Z)))
		);
	}

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

	static prefix(str, prefix) {
		if (Array.isArray(str)) {
			str = str.join("\n");
		}
		str = str.trim();
		if (!str) return "";
		const ind = str[0] === "\n" ? "" : prefix;
		return ind + str.replace(/\n([^\n])/g, "\n" + prefix + "$1");
	}

	static asString(str) {
		if (Array.isArray(str)) {
			return str.join("\n");
		}
		return str;
	}

	static getModulesArrayBounds(modules) {
		if (!modules.every(moduleIdIsNumber)) return false;
		var maxId = -Infinity;
		var minId = Infinity;
		for (const module of modules) {
			if (maxId < module.id) maxId = module.id;
			if (minId > module.id) minId = module.id;
		}
		if (minId < 16 + ("" + minId).length) {
			// add minId x ',' instead of 'Array(minId).concat(...)'
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
		var removedModules = chunk.removedModules;
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
};
