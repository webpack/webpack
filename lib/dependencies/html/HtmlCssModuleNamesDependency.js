/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const isDependencyKind = require("../../graph/isDependencyKind");
const makeSerializable = require("../../util/makeSerializable");
const memoize = require("../../util/memoize");
const NullDependency = require("../core/NullDependency");

const getHtmlSyntax = memoize(() => require("../../html/syntax-parser"));
const getSourceProcessor = memoize(
	() => require("../../html/syntax").SourceProcessor
);

/** @import { ReplaceSource } from "webpack-sources" */
/** @import Dependency from "../../graph/Dependency" */
/** @import { DependencyTemplateContext } from "../../template/DependencyTemplate" */
/** @import Module from "../../module/Module" */
/** @import CodeGenerationResults from "../../module/CodeGenerationResults" */
/** @import { BuiltCssModule } from "../../css/CssModule" */
/** @import { HtmlCssModulesAttributeKind } from "../../../declarations/WebpackOptions" */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectDeserializerContext<[CssModuleNames | undefined, CssModuleNamesRescan | undefined]>} ObjectDeserializerContext */
/** @typedef {import("../../serialization/ObjectMiddleware").ObjectSerializerContext<[CssModuleNames | undefined, CssModuleNamesRescan | undefined]>} ObjectSerializerContext */

/**
 * The page's values naming a class or an id, three numbers each, in one flat
 * array (a page can have thousands): the value's source span (it is read back
 * from the page when generating, so a page keeps only offsets), then its kind
 * (a `CSS_MODULE_NAME_*` constant), whether it is inside `<template>` content
 * (`CSS_MODULE_NAME_IN_TEMPLATE`), and the quote it is written in shifted
 * above both (a char code, 0 when unquoted).
 * @typedef {number[]} CssModuleNames
 */

/**
 * What a page that kept no offsets needs to find them again as its parse did.
 * @typedef {object} CssModuleNamesRescan
 * @property {number[]=} ignored start offsets of the `webpackIgnore`d elements, whose values stay as written
 * @property {string=} fragmentContext the context element the page is parsed in, for a page that is a fragment
 * @property {[string, number][]=} attributes the attributes `module.parser.html.cssModules.attributes` adds, with their kinds
 */

// A class list (`class`).
const CSS_MODULE_NAME_CLASS = 0;
// One id (`id`).
const CSS_MODULE_NAME_ID = 1;
// Id references, one or a list (`for`, `aria-labelledby`, `headers`, ...).
const CSS_MODULE_NAME_ID_REFS = 2;
// A same-page fragment, `#id` (`href`).
const CSS_MODULE_NAME_FRAGMENT = 3;
// `url(#id)` references (`fill`, `clip-path`, `mask`, ...).
const CSS_MODULE_NAME_URL = 4;
// SMIL timing, `id.event` (`begin`, `end`).
const CSS_MODULE_NAME_TIMING = 5;

const CSS_MODULE_NAME_KIND_MASK = 7;
// A value inside `<template>` content, which is not in the document tree.
const CSS_MODULE_NAME_IN_TEMPLATE = 8;
const CSS_MODULE_NAME_QUOTE_SHIFT = 4;

/** @type {Record<HtmlCssModulesAttributeKind, number>} */
const KIND_BY_NAME = {
	class: CSS_MODULE_NAME_CLASS,
	id: CSS_MODULE_NAME_ID,
	ids: CSS_MODULE_NAME_ID_REFS,
	fragment: CSS_MODULE_NAME_FRAGMENT,
	url: CSS_MODULE_NAME_URL
};

/**
 * The attributes whose values name a class or an id, by kind.
 * @type {Map<string, number>}
 */
const CSS_MODULE_NAME_ATTRIBUTES = new Map([
	["class", CSS_MODULE_NAME_CLASS],
	["id", CSS_MODULE_NAME_ID],
	["for", CSS_MODULE_NAME_ID_REFS],
	["form", CSS_MODULE_NAME_ID_REFS],
	["list", CSS_MODULE_NAME_ID_REFS],
	["headers", CSS_MODULE_NAME_ID_REFS],
	["itemref", CSS_MODULE_NAME_ID_REFS],
	["popovertarget", CSS_MODULE_NAME_ID_REFS],
	["commandfor", CSS_MODULE_NAME_ID_REFS],
	["interestfor", CSS_MODULE_NAME_ID_REFS],
	["aria-activedescendant", CSS_MODULE_NAME_ID_REFS],
	["aria-controls", CSS_MODULE_NAME_ID_REFS],
	["aria-describedby", CSS_MODULE_NAME_ID_REFS],
	["aria-details", CSS_MODULE_NAME_ID_REFS],
	["aria-errormessage", CSS_MODULE_NAME_ID_REFS],
	["aria-flowto", CSS_MODULE_NAME_ID_REFS],
	["aria-labelledby", CSS_MODULE_NAME_ID_REFS],
	["aria-owns", CSS_MODULE_NAME_ID_REFS],
	["href", CSS_MODULE_NAME_FRAGMENT],
	["xlink:href", CSS_MODULE_NAME_FRAGMENT],
	["fill", CSS_MODULE_NAME_URL],
	["stroke", CSS_MODULE_NAME_URL],
	["clip-path", CSS_MODULE_NAME_URL],
	["mask", CSS_MODULE_NAME_URL],
	["filter", CSS_MODULE_NAME_URL],
	["marker-start", CSS_MODULE_NAME_URL],
	["marker-mid", CSS_MODULE_NAME_URL],
	["marker-end", CSS_MODULE_NAME_URL],
	["begin", CSS_MODULE_NAME_TIMING],
	["end", CSS_MODULE_NAME_TIMING]
]);

/**
 * The attributes a parser rewrites: the built-in ones, and those its options add.
 * @param {Record<string, HtmlCssModulesAttributeKind> | undefined} extra the attributes `module.parser.html.cssModules.attributes` adds
 * @returns {{ attributes: Map<string, number>, added: [string, number][] | undefined }} the attributes, and the added ones with their kinds
 */
const getCssModuleNameAttributes = (extra) => {
	if (extra === undefined) {
		return { attributes: CSS_MODULE_NAME_ATTRIBUTES, added: undefined };
	}
	/** @type {[string, number][]} */
	const added = [];
	for (const name of Object.keys(extra)) {
		added.push([name.toLowerCase(), KIND_BY_NAME[extra[name]]]);
	}
	if (added.length === 0) {
		return { attributes: CSS_MODULE_NAME_ATTRIBUTES, added: undefined };
	}
	return {
		attributes: new Map([...CSS_MODULE_NAME_ATTRIBUTES, ...added]),
		added
	};
};

// HTML splits a class list on ASCII whitespace only: `&nbsp;` is part of a name.
const WHITESPACE_SPLIT_REGEXP = /([\t\n\f\r ]+)/;
// What an unquoted attribute value cannot hold (§13.2.5.36).
const UNQUOTED_UNSAFE_REGEXP = /[\t\n\f\r "'=<>`]/;
// A `url(#id)` reference; the id is what sits between the `#` and the close.
const URL_FRAGMENT_REGEXP = /(url\(\s*)(["']?)#([^"')\s]+)\2(\s*\))/gi;
const URL_REGEXP = /url\(/i;
// A SMIL timing value: `id.event` or `id.begin`/`id.end`/`id.repeat(n)`, then an offset.
const TIMING_REGEXP =
	/^(\s*)(\S+?)(\.(?:[A-Za-z][\w-]*|repeat\(\d+\))\s*(?:[+-][^;]*)?)$/;

/**
 * Records a value naming a class or an id.
 * @param {import("../../html/syntax").HtmlPath} path the element
 * @param {import("../../html/syntax-parser").HtmlAttributeRef} attr the attribute
 * @param {string} attrName its name
 * @param {string} source the page
 * @param {CssModuleNames} names where to record it
 * @param {Map<string, number>} attributes the attributes to record, by kind
 * @param {boolean} inTemplate whether the element is inside `<template>` content
 */
const collectCssModuleName = (
	path,
	attr,
	attrName,
	source,
	names,
	attributes,
	inTemplate
) => {
	const kind = attributes.get(attrName);
	if (kind === undefined) return;
	const { Part } = getHtmlSyntax();
	const start = path.startOf(Part.value, attr);
	if (start === -1) return;
	const end = path.endOf(Part.value, attr);
	if (end <= start) return;
	switch (kind) {
		// Only a same-page fragment links to an id: `#`, or a character reference
		// that may decode to one (checked when generating).
		case CSS_MODULE_NAME_FRAGMENT: {
			const first = source.charCodeAt(start);
			if (first !== 35 && first !== 38) return;
			break;
		}
		case CSS_MODULE_NAME_URL:
			if (!URL_REGEXP.test(source.slice(start, end))) return;
			break;
		case CSS_MODULE_NAME_TIMING:
			if (!source.slice(start, end).includes(".")) return;
			break;
	}
	const quote = source.charCodeAt(start - 1);
	names.push(
		start,
		end,
		((quote === 34 || quote === 39 ? quote : 0) <<
			CSS_MODULE_NAME_QUOTE_SHIFT) |
			(inTemplate ? CSS_MODULE_NAME_IN_TEMPLATE : 0) |
			kind
	);
};

/**
 * Finds the page's names again, for a page that kept none, as its parse did.
 * @param {string} source the page
 * @param {CssModuleNamesRescan | undefined} rescan what its parse knew
 * @returns {CssModuleNames} its names
 */
const findCssModuleNames = (source, rescan) => {
	const { Field, Flag, NodeType } = getHtmlSyntax();
	const ignored =
		rescan !== undefined && rescan.ignored !== undefined
			? new Set(rescan.ignored)
			: undefined;
	const attributes =
		rescan !== undefined && rescan.attributes !== undefined
			? new Map([...CSS_MODULE_NAME_ATTRIBUTES, ...rescan.attributes])
			: CSS_MODULE_NAME_ATTRIBUTES;
	/** @type {CssModuleNames} */
	const names = [];
	let templateDepth = 0;
	/**
	 * @param {import("../../html/syntax").HtmlPath} path the element
	 * @returns {boolean} whether it is an HTML `<template>`
	 */
	const isTemplate = (path) =>
		path.name() === "template" &&
		!path.flag(Flag.svg) &&
		!path.flag(Flag.mathml);
	const SourceProcessor = getSourceProcessor();
	new SourceProcessor()
		.use({
			[NodeType.Element]: {
				enter: (path) => {
					const inTemplate = templateDepth > 0;
					if (isTemplate(path)) templateDepth++;
					if (ignored !== undefined && ignored.has(path.start(path.node))) {
						return;
					}
					const count = path.fieldCount(Field.attributes);
					for (let i = 0; i < count; i++) {
						const attr = path.field(i, Field.attributes);
						collectCssModuleName(
							path,
							attr,
							path.name(attr),
							source,
							names,
							attributes,
							inTemplate
						);
					}
				},
				exit: (path) => {
					if (templateDepth > 0 && isTemplate(path)) templateDepth--;
				}
			}
		})
		.process(source, {
			fragmentContext: rescan && rescan.fragmentContext,
			skip: { text: true, doctype: true }
		});
	return names;
};

/**
 * @param {string} scoped a scoped name, with the names `composes` adds
 * @returns {string} the name an id takes
 */
const firstName = (scoped) => {
	const i = scoped.indexOf(" ");
	return i === -1 ? scoped : scoped.slice(0, i);
};

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
 * @param {Map<string, string>} target where the names go
 * @param {Map<string, string>} names a module's names
 */
const addLocals = (target, names) => {
	for (const [name, value] of names) {
		if (!target.has(name)) target.set(name, value);
	}
};

/**
 * The page's `class`, `id` and id-referencing values, rewritten with the
 * names its CSS modules give them — a `<style module>` body or a linked
 * stylesheet that is a CSS module. A name none of them declares stays as
 * written, so global classes keep working; the first module to declare a
 * name decides it. A named module (`<style module="card">`) is read only
 * through its name, `card.btn`. Selectors in the page's scripts are not
 * rewritten.
 */
class HtmlCssModuleNamesDependency extends NullDependency {
	/**
	 * @param {CssModuleNames | undefined} names the page's values, or none when the page finds them again if it needs them
	 * @param {CssModuleNamesRescan=} rescan what finding them again needs
	 */
	constructor(names, rescan) {
		super();
		this.names = names;
		this.rescan = rescan;
	}

	get type() {
		return "html css module names";
	}

	/**
	 * Serializes this instance into the provided serializer context.
	 * @param {ObjectSerializerContext} context context
	 */
	serialize(context) {
		context.write(this.names).write(this.rescan);
		super.serialize(context);
	}

	/**
	 * Restores this instance from the provided deserializer context.
	 * @param {ObjectDeserializerContext} context context
	 */
	deserialize(context) {
		this.names = context.read();
		this.rescan = context.rest.read();
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
		/** @type {Map<string, Map<string, string>> | undefined} */
		let namedLocals;
		for (const d of module.dependencies) {
			// A linked stylesheet read for its names, or a `<style module>` body.
			/** @type {string | undefined} */
			let name;
			if (isDependencyKind(d, "html-css-module")) {
				name = d.cssModuleName;
			} else if (isDependencyKind(d, "html-inline-style") && d.cssModule) {
				name = d.cssModuleName;
			} else {
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
			if (name === undefined) {
				addLocals(locals, moduleLocals);
			} else {
				if (namedLocals === undefined) namedLocals = new Map();
				let named = namedLocals.get(name);
				if (named === undefined) {
					named = new Map();
					namedLocals.set(name, named);
				}
				addLocals(named, moduleLocals);
			}
		}
		if (locals.size === 0 && namedLocals === undefined) return;

		/**
		 * @param {string} token a class or an id as the page writes it
		 * @returns {string | undefined} its scoped name: an unnamed module's, or a named one's for `name.local`
		 */
		const resolve = (token) => {
			const scoped = locals.get(token);
			if (scoped !== undefined || namedLocals === undefined) return scoped;
			const dot = token.indexOf(".");
			if (dot <= 0) return;
			const named = namedLocals.get(token.slice(0, dot));
			return named && named.get(token.slice(dot + 1));
		};

		const { decodeEntities, escapeAttribute } = getHtmlSyntax();
		const text = /** @type {string} */ (source.original().source());
		const names = dep.names || findCssModuleNames(text, dep.rescan);

		/** @type {Set<string> | undefined} */
		let pageIds;
		// The ids of the document tree, as written: `<template>` content is not in it.
		const getPageIds = () => {
			if (pageIds !== undefined) return pageIds;
			pageIds = new Set();
			for (let n = 0; n < names.length; n += 3) {
				const meta = names[n + 2];
				if (
					(meta & CSS_MODULE_NAME_KIND_MASK) !== CSS_MODULE_NAME_ID ||
					(meta & CSS_MODULE_NAME_IN_TEMPLATE) !== 0
				) {
					continue;
				}
				const raw = text.slice(names[n], names[n + 1]);
				pageIds.add(raw.includes("&") ? decodeEntities(raw, true) : raw);
			}
			return pageIds;
		};

		/**
		 * A fragment's target as a browser finds it: the literal id, else its
		 * percent-decoded form — unless the page has an element with the literal id.
		 * @param {string} fragment the fragment, without its `#`
		 * @returns {string | undefined} the scoped name of the id it targets
		 */
		const getFragmentTarget = (fragment) => {
			const scoped = resolve(fragment);
			if (scoped !== undefined || !fragment.includes("%")) return scoped;
			if (getPageIds().has(fragment)) return;
			try {
				return resolve(decodeURIComponent(fragment));
			} catch (_err) {
				return undefined;
			}
		};

		for (let n = 0; n < names.length; n += 3) {
			const start = names[n];
			const end = names[n + 1];
			const meta = names[n + 2];
			const kind = meta & CSS_MODULE_NAME_KIND_MASK;
			const quote = meta >>> CSS_MODULE_NAME_QUOTE_SHIFT;
			const raw = text.slice(start, end);
			const value = raw.includes("&") ? decodeEntities(raw, true) : raw;
			/** @type {string | undefined} */
			let result;
			switch (kind) {
				case CSS_MODULE_NAME_ID: {
					const scoped = resolve(value);
					// `composes` gives a class more than one name; an id has one.
					if (scoped !== undefined) result = firstName(scoped);
					break;
				}
				case CSS_MODULE_NAME_FRAGMENT: {
					if (value.charCodeAt(0) !== 35) break;
					const scoped = getFragmentTarget(value.slice(1));
					if (scoped !== undefined) result = `#${firstName(scoped)}`;
					break;
				}
				case CSS_MODULE_NAME_URL: {
					let changed = false;
					const replaced = value.replace(
						URL_FRAGMENT_REGEXP,
						(match, open, q, fragment, close) => {
							const scoped = getFragmentTarget(fragment);
							if (scoped === undefined) return match;
							changed = true;
							return `${open}${q}#${firstName(scoped)}${q}${close}`;
						}
					);
					if (changed) result = replaced;
					break;
				}
				case CSS_MODULE_NAME_TIMING: {
					let changed = false;
					const parts = value.split(";");
					for (let i = 0; i < parts.length; i++) {
						const match = TIMING_REGEXP.exec(parts[i]);
						if (match === null) continue;
						const scoped = resolve(match[2]);
						if (scoped === undefined) continue;
						parts[i] = `${match[1]}${firstName(scoped)}${match[3]}`;
						changed = true;
					}
					if (changed) result = parts.join(";");
					break;
				}
				default: {
					let changed = false;
					const parts = value.split(WHITESPACE_SPLIT_REGEXP);
					for (let i = 0; i < parts.length; i += 2) {
						const scoped = resolve(parts[i]);
						if (scoped !== undefined) {
							parts[i] =
								kind === CSS_MODULE_NAME_ID_REFS ? firstName(scoped) : scoped;
							changed = true;
						}
					}
					if (!changed) break;
					if (kind === CSS_MODULE_NAME_ID_REFS) {
						result = parts.join("");
						break;
					}
					// `composes` repeats a name a chain pulls in twice (as the JS exports
					// do); a class list names each once, so a rewritten one is deduped.
					/** @type {Set<string>} */
					const unique = new Set();
					for (let i = 0; i < parts.length; i += 2) {
						for (const name of parts[i].split(" ")) {
							if (name !== "") unique.add(name);
						}
					}
					result = [...unique].join(" ");
				}
			}
			if (result === undefined) continue;
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

HtmlCssModuleNamesDependency.collectCssModuleName = collectCssModuleName;
HtmlCssModuleNamesDependency.getCssModuleNameAttributes =
	getCssModuleNameAttributes;

module.exports = HtmlCssModuleNamesDependency;
