/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const isDependencyKind = require("../../graph/isDependencyKind");
const makeSerializable = require("../../util/makeSerializable");
const memoize = require("../../util/memoize");
const NullDependency = require("../core/NullDependency");

const getHtmlSyntax = memoize(() => require("../../html/syntax-parser"));

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency from "../../graph/Dependency" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import Module from "../../module/Module" */
/** @import CodeGenerationResults from "../../module/CodeGenerationResults" */
/** @import { BuiltCssModule } from "../../css/CssModule" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[CssModuleName[]]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[CssModuleName[]]>} ObjectSerializerContext */

/**
 * A `class` or `id` value of the page: its source span (the value is read
 * back from the page when generating, so a page keeps only offsets), whether
 * it is an `id`, and the quote it is written in (a char code, 0 when unquoted).
 * @typedef {[number, number, boolean, number]} CssModuleName
 */

// HTML splits a class list on ASCII whitespace only: `&nbsp;` is part of a name.
const WHITESPACE_SPLIT_REGEXP = /([\t\n\f\r ]+)/;
// What an unquoted attribute value cannot hold (§13.2.5.36).
const UNQUOTED_UNSAFE_REGEXP = /[\t\n\f\r "'=<>`]/;

/**
 * @param {Module} module a CSS module
 * @param {CodeGenerationResults} codeGenerationResults code generation results
 * @returns {Map<string, string> | undefined} its local names, from whichever runtime generated it
 */
const getLocals = (module, codeGenerationResults) => {
	const results = codeGenerationResults.map.get(module);
	if (results === undefined) return;
	for (const result of results.values()) {
		/** @type {Map<string, string> | undefined} */
		const locals = result.data && result.data.get("cssLocals");
		if (locals !== undefined) return locals;
	}
};

/**
 * The page's `class` and `id` values, rewritten with the names its CSS
 * modules give them — a `<style module>` body or a linked stylesheet that is
 * a CSS module. A name none of them declares stays as written, so global
 * classes keep working; the first module to declare a name decides it.
 * Selectors in the page's scripts are not rewritten.
 */
class HtmlCssModuleNamesDependency extends NullDependency {
	/**
	 * @param {CssModuleName[]} names the page's `class` and `id` values
	 */
	constructor(names) {
		super();
		this.names = names;
	}

	get type() {
		return "html css module names";
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.names);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.names = context.read();
		super.deserialize(context);
	}
}

HtmlCssModuleNamesDependency.Template = class HtmlCssModuleNamesDependencyTemplate extends (
	NullDependency.Template
) {
	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {Dependency} dependency the dependency for which the template should be applied
	 * @param {ReplaceSource} source the current replace source which can be modified
	 * @param {DependencyTemplateContext} templateContext the context object
	 * @returns {void}
	 */
	apply(dependency, source, { module, moduleGraph, codeGenerationResults }) {
		const dep = /** @type {HtmlCssModuleNamesDependency} */ (dependency);
		/** @type {Map<string, string>} */
		const locals = new Map();
		for (const d of module.dependencies) {
			// A linked stylesheet read for its names, or a `<style module>` body.
			if (
				!isDependencyKind(d, "html-css-module") &&
				!(isDependencyKind(d, "html-inline-style") && d.cssModule)
			) {
				continue;
			}
			const cssModule =
				/** @type {BuiltCssModule | null} */
				(moduleGraph.getModule(d));
			if (
				!cssModule ||
				!cssModule.buildMeta ||
				!cssModule.buildMeta.isCssModule
			) {
				continue;
			}
			const moduleLocals = getLocals(cssModule, codeGenerationResults);
			if (moduleLocals === undefined) continue;
			for (const [name, value] of moduleLocals) {
				if (!locals.has(name)) locals.set(name, value);
			}
		}
		if (locals.size === 0) return;

		const { decodeEntities, escapeAttribute } = getHtmlSyntax();
		const text = /** @type {string} */ (source.original().source());
		for (const [start, end, isId, quote] of dep.names) {
			const raw = text.slice(start, end);
			const value = raw.includes("&") ? decodeEntities(raw, true) : raw;
			let changed = false;
			/** @type {string} */
			let result;
			if (isId) {
				const scoped = locals.get(value);
				if (scoped === undefined) continue;
				// `composes` gives a class more than one name; an id has one.
				result = scoped.split(" ")[0];
				changed = true;
			} else {
				const parts = value.split(WHITESPACE_SPLIT_REGEXP);
				for (let i = 0; i < parts.length; i += 2) {
					const scoped = locals.get(parts[i]);
					if (scoped !== undefined) {
						parts[i] = scoped;
						changed = true;
					}
				}
				if (!changed) continue;
				// `composes` repeats a name a chain pulls in twice (as the JS exports
				// do); a class list names each once, so a rewritten one is deduped.
				/** @type {Set<string>} */
				const names = new Set();
				for (let i = 0; i < parts.length; i += 2) {
					for (const name of parts[i].split(" ")) {
						if (name !== "") names.add(name);
					}
				}
				result = [...names].join(" ");
			}
			if (!changed) continue;
			const escaped = escapeAttribute(result, quote === 0 ? undefined : quote);
			// An unquoted value is quoted once it holds what one cannot: the space
			// `composes` adds, or a `>` a scoped name decodes to.
			source.replace(
				start,
				end - 1,
				quote !== 0 || (escaped !== "" && !UNQUOTED_UNSAFE_REGEXP.test(escaped))
					? escaped
					: `"${escaped}"`
			);
		}
	}
};

makeSerializable(
	HtmlCssModuleNamesDependency,
	"webpack/lib/dependencies/html/HtmlCssModuleNamesDependency"
);

module.exports = HtmlCssModuleNamesDependency;
