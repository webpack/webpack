/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// cspell:ignore fnames, classnames

/** @typedef {import("./syntax-printer").MinifyOptions} MinifyOptions */

/**
 * terser's option names that webpack spells in camelCase, by option group.
 * Each is read as an alias of its camelCase name, so a terser configuration
 * minifies unchanged; where a group names both, the camelCase one wins.
 */
const TERSER_ALIASES = {
	minify: ["keep_classnames", "keep_fnames"],
	compress: [
		"builtins_ecma",
		"computed_props",
		"dead_code",
		"drop_console",
		"drop_debugger",
		"global_defs",
		"join_vars",
		"keep_classnames",
		"keep_fargs",
		"keep_fnames",
		"keep_infinity",
		"negate_iife",
		"pure_conversions",
		"pure_funcs",
		"side_effects",
		"top_retain"
	],
	mangle: ["keep_classnames", "keep_fnames", "nth_identifier"],
	properties: ["keep_quoted", "nth_identifier", "only_annotated", "only_cache"],
	format: [
		"ascii_only",
		"indent_level",
		"indent_start",
		"inline_script",
		"keep_numbers",
		"keep_quoted_props",
		"max_line_len",
		"preserve_annotations",
		"quote_keys",
		"quote_style",
		"wrap_func_args",
		"wrap_iife"
	],
	parse: ["bare_returns", "html5_comments"]
};

/**
 * @param {string} name a snake_case name
 * @returns {string} the same name in camelCase
 */
const camelCaseOf = (name) =>
	name.replace(
		/_([a-z\d])/g,
		/**
		 * @param {string} _match an underscore and the character after it
		 * @param {string} character the character after it
		 * @returns {string} the character, upper case
		 */
		(_match, character) => character.toUpperCase()
	);

/**
 * An option group with each name it holds in one spelling written in the
 * other; the camelCase one wins where the group holds both.
 * @template {object} T
 * @param {T} group the options, as given
 * @param {string[]} aliases terser's names the group may hold
 * @param {boolean} toTerser true to write terser's names, false to read them as camelCase
 * @returns {T} the group, copied where it held one
 */
const renameGroup = (group, aliases, toTerser) => {
	const given = /** @type {Record<string, T[keyof T]>} */ (group);
	const { hasOwnProperty } = Object.prototype;
	let renamed = given;
	for (const alias of aliases) {
		const name = camelCaseOf(alias);
		const from = toTerser ? name : alias;
		const to = toTerser ? alias : name;
		if (!hasOwnProperty.call(given, from)) continue;
		if (renamed === given) renamed = { ...given };
		if (toTerser || !hasOwnProperty.call(given, to)) {
			renamed[to] = given[from];
		}
		delete renamed[from];
	}
	return /** @type {T} */ (renamed);
};

/**
 * An option group with each of terser's names it holds read as its camelCase
 * name, which wins where the group holds both.
 * @template {object} T
 * @param {T} group the options, as given
 * @param {string[]} aliases terser's names the group may hold
 * @returns {T} the group, copied where it held one
 */
const withTerserAliases = (group, aliases) =>
	renameGroup(group, aliases, false);

/**
 * Minify options with every group renamed, nested ones included.
 * @param {MinifyOptions} options the options, as given
 * @param {boolean} toTerser true to write terser's names, false to read them as camelCase
 * @returns {MinifyOptions} the options, copied where one was renamed
 */
const renameOptions = (options, toTerser) => {
	const renamed = renameGroup(options, TERSER_ALIASES.minify, toTerser);
	const result = renamed === options ? { ...options } : renamed;
	const { compress, parse, mangle } = result;
	if (compress && typeof compress === "object") {
		result.compress = renameGroup(compress, TERSER_ALIASES.compress, toTerser);
	}
	if (parse && typeof parse === "object") {
		result.parse = renameGroup(parse, TERSER_ALIASES.parse, toTerser);
	}
	// `output` is terser's older name for `format`.
	if (result.format && typeof result.format === "object") {
		result.format = renameGroup(result.format, TERSER_ALIASES.format, toTerser);
	}
	if (result.output && typeof result.output === "object") {
		result.output = renameGroup(result.output, TERSER_ALIASES.format, toTerser);
	}
	if (mangle && typeof mangle === "object") {
		const named = renameGroup(mangle, TERSER_ALIASES.mangle, toTerser);
		const { properties } = named;
		result.mangle =
			properties && typeof properties === "object"
				? {
						...named,
						properties: renameGroup(
							properties,
							TERSER_ALIASES.properties,
							toTerser
						)
					}
				: named;
	}
	return result;
};

/**
 * Minify options with terser's names read as their camelCase ones, as
 * webpack's minifier reads them.
 * @param {MinifyOptions} options the options, as given
 * @returns {MinifyOptions} the options, copied
 */
const fromTerserNames = (options) => renameOptions(options, false);

/**
 * Minify options with camelCase names written as terser's, for the terser
 * package, which knows only its own spelling.
 * @param {MinifyOptions} options the options, as given
 * @returns {MinifyOptions} the options, copied
 */
const toTerserNames = (options) => renameOptions(options, true);

module.exports = {
	TERSER_ALIASES,
	fromTerserNames,
	toTerserNames,
	withTerserAliases
};
