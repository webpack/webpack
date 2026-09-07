"use strict";

// Holds ESM output to what a foreign bundler makes of it: a chunk only webpack's
// runtime reaches is a finding unless the build says why it kept that form.

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const { initSync, parse } = require("es-module-lexer");

/** @import { Compilation, Module } from "../../" */

initSync();

const JS_ASSET = /\.[cm]?js$/;
// A specifier naming a place rather than a package: what webpack emitted is
// spelled relative to the importer or rooted at the server, never bare.
const PLACED_SPECIFIER = /^(?:\.{1,2}\/|\/)/;
const HAS_SCHEME = /^(?:[a-z][a-z0-9+\-.]*:|\/\/)/i;

/**
 * @typedef {object} Subject
 * @property {Compilation} compilation a sealed compilation
 * @property {string=} name what to call it in a report
 */

/**
 * Visits every node of an AST, arrays and nested objects included.
 * @param {EXPECTED_ANY} node any AST node, array of them, or neither
 * @param {(node: EXPECTED_ANY) => void} visit called once per node
 * @returns {void}
 */
const walk = (node, visit) => {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const child of node) walk(child, visit);
		return;
	}
	if (typeof node.type === "string") visit(node);
	for (const key of Object.keys(node)) {
		if (key === "type" || key === "loc" || key === "start" || key === "end") {
			continue;
		}
		walk(node[key], visit);
	}
};

/**
 * The string a `new URL(…, import.meta.url)` names, or nothing where it is built
 * rather than written out.
 * @param {EXPECTED_ANY} node the node to read
 * @returns {string | undefined} the specifier
 */
const urlSpecifierOf = (node) => {
	if (node.type !== "NewExpression") return;
	if (!node.callee || node.callee.name !== "URL") return;
	const [specifier] = node.arguments;
	if (!specifier || specifier.type !== "Literal") return;
	return typeof specifier.value === "string" ? specifier.value : undefined;
};

/**
 * Specifiers a static analyzer can read out of one emitted file: the imports a
 * lexer reports plus the urls only an AST names.
 * @param {string} code the emitted source
 * @returns {string[]} every literal specifier it holds
 */
const literalSpecifiersOf = (code) => {
	/** @type {string[]} */
	const found = [];
	const [imports] = parse(code);
	for (const entry of imports) {
		// Set only where the specifier is a plain string, which is the whole
		// question: an expression leaves it undefined.
		if (entry.n !== undefined) found.push(entry.n);
	}
	/** @type {EXPECTED_ANY} */
	let ast;
	try {
		ast = acorn.parse(code, {
			ecmaVersion: "latest",
			sourceType: "module",
			allowHashBang: true
		});
	} catch (_error) {
		// The lexer read it, so a foreign bundler can follow its imports; only the
		// url scan below needs a tree, and syntax acorn is behind on stops just it.
		return found;
	}
	walk(ast, (node) => {
		const specifier = urlSpecifierOf(node);
		if (specifier !== undefined) found.push(specifier);
	});
	return found;
};

/**
 * The path part of a specifier, as the engine reading it would, and whether it
 * names a place this output owns. A rooted or hosted url is served from a layout
 * only the deployment knows, and a relative one climbing past the output root
 * names another build, so neither states what this compilation should have
 * emitted. `undefined` where the specifier names a package rather than a place.
 * @param {string} specifier the specifier as written
 * @param {string} fromDirectory the directory of the file carrying it, posix
 * @returns {{ place: string, inside: boolean } | undefined} where it points
 */
const placeOf = (specifier, fromDirectory) => {
	const [withoutHash] = specifier.split("#");
	const [text] = withoutHash.split("?");
	if (HAS_SCHEME.test(text)) {
		if (!/^(?:https?:|\/\/)/i.test(text)) return;
		const { pathname } = new URL(text.startsWith("//") ? `http:${text}` : text);
		return { place: pathname.replace(/^\/+/, ""), inside: false };
	}
	// A trailing slash names the directory a runtime resolves against — the
	// public path itself — rather than a file webpack emitted.
	if (text === "" || text.endsWith("/")) return;
	if (!PLACED_SPECIFIER.test(text)) return;
	if (text.startsWith("/")) {
		return { place: text.replace(/^\/+/, ""), inside: false };
	}
	const place = path.posix.join(fromDirectory, text);
	return { place, inside: !place.startsWith("../") };
};

/**
 * The emitted asset a specifier names, matched the way the file is served rather
 * than the way it is stored: a public path prefixes what the output root holds,
 * so the tail of the specifier is what identifies the file. The longest match
 * wins, so a name under a directory beats the same name at the root.
 * @param {string} place the path the specifier names
 * @param {Set<string>} assets emitted asset names, relative to the output root
 * @returns {string | undefined} the asset it names
 */
const assetNamed = (place, assets) => {
	/** @type {string | undefined} */
	let best;
	for (const asset of assets) {
		if (place !== asset && !place.endsWith(`/${asset}`)) continue;
		if (best === undefined || asset.length > best.length) best = asset;
	}
	return best;
};

/**
 * Every reason the build gives for output another tool cannot follow: what the
 * runtime template recorded, plus the one fact it does not record — an `eval`
 * devtool writes each module's specifiers inside a string, so a literal `import()`
 * is emitted and no lexer can see it.
 * @param {Compilation} compilation the compilation
 * @returns {string[]} the reasons, deduplicated
 */
const recordedBailoutsOf = (compilation) => {
	const { chunkGraph, runtimeTemplate } = compilation;
	/** @type {Set<string>} */
	const reasons = new Set();
	const { devtool } = compilation.options;
	if (typeof devtool === "string" && devtool.includes("eval")) {
		reasons.add(
			`devtool ${JSON.stringify(devtool)} wraps each module in eval(), where no analyzer reads the specifiers it writes`
		);
	}
	/**
	 * @param {Module} module the module to read
	 * @returns {void}
	 */
	const collect = (module) => {
		for (const reason of runtimeTemplate.analyzableBailoutsOf(module)) {
			reasons.add(reason);
		}
	};
	for (const module of compilation.modules) collect(module);
	for (const chunk of compilation.chunks) {
		for (const module of chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
			collect(module);
		}
	}
	return [...reasons];
};

/**
 * What was written for one emitted name. The disk holds it; the compilation is
 * the fallback for a directory already cleaned, and answers only where it kept
 * the bytes — after emit an asset may be a stand-in that knows just its size.
 * @param {Compilation} compilation the compilation that emitted it
 * @param {string} root the output directory
 * @param {string} name the asset name
 * @returns {string | undefined} the source, where it can still be read
 */
const emittedCode = (compilation, root, name) => {
	try {
		return fs.readFileSync(path.join(root, name), "utf8");
	} catch (_error) {
		const asset = compilation.assets[name];
		if (asset === undefined) return;
		try {
			return asset.source().toString();
		} catch (_sourceError) {
			return undefined;
		}
	}
};

/**
 * Walks one compilation's emitted javascript the way a foreign bundler would.
 * @param {Compilation} compilation a sealed compilation
 * @returns {string[]} findings, each already readable on its own
 */
const checkAnalyzableConformance = (compilation) => {
	const { outputOptions } = compilation;
	// Only ESM output claims to be analyzable, and a build that errored emits
	// whatever it got to rather than what it would have written out.
	if (!outputOptions.module || compilation.errors.length > 0) return [];
	const root = /** @type {string} */ (outputOptions.path);
	/** @type {Set<string>} */
	const assets = new Set(Object.keys(compilation.assets));
	// Only what a chunk was written to: an asset a plugin copied in belongs to no
	// chunk, so nothing in the bundle names it and nothing should.
	/** @type {Set<string>} */
	const javascript = new Set();
	for (const chunk of compilation.chunks) {
		for (const file of chunk.files) {
			if (JS_ASSET.test(file)) javascript.add(file);
		}
	}
	if (javascript.size === 0) return [];

	/** @type {string[]} */
	const findings = [];
	/** @type {Set<string>} */
	const reached = new Set();
	/** @type {string[]} */
	const queue = [];

	for (const entrypoint of compilation.entrypoints.values()) {
		for (const file of entrypoint.getFiles()) {
			if (!JS_ASSET.test(file) || reached.has(file)) continue;
			reached.add(file);
			queue.push(file);
		}
	}

	while (queue.length > 0) {
		const name = /** @type {string} */ (queue.pop());
		const code = emittedCode(compilation, root, name);
		if (code === undefined) continue;
		/** @type {string[]} */
		let specifiers;
		try {
			specifiers = literalSpecifiersOf(code);
		} catch (error) {
			findings.push(
				`${name} does not parse as a module: ${
					/** @type {Error} */ (error).message
				}`
			);
			continue;
		}
		const from = path.posix.dirname(name.split(path.sep).join("/"));
		for (const specifier of specifiers) {
			const named = placeOf(specifier, from);
			if (named === undefined) continue;
			const asset = assetNamed(named.place, assets);
			if (asset === undefined) {
				// A sibling compilation writes into the same directory, so the disk
				// answers for names this one did not emit but the case still ships.
				if (
					named.inside &&
					!fs.existsSync(path.join(root, ...named.place.split("/")))
				) {
					findings.push(`${name} names ${specifier}, which was not emitted`);
				}
				continue;
			}
			if (!JS_ASSET.test(asset) || reached.has(asset)) continue;
			reached.add(asset);
			queue.push(asset);
		}
	}

	const unreached = [...javascript].filter((name) => !reached.has(name)).sort();
	if (unreached.length > 0) {
		const reasons = recordedBailoutsOf(compilation);
		// A recorded reason is webpack saying which reference it could not write
		// out, so the chunk behind it is explained rather than lost.
		if (reasons.length === 0) {
			findings.push(
				`no literal specifier reaches ${unreached.join(", ")}, and nothing was recorded about why`
			);
		}
	}
	return findings;
};

/**
 * @param {Iterable<Subject>} subjects sealed compilations to hold to their output
 * @param {RegExp[]=} expected findings the case declares as deliberate, each of
 * which must still match something — an entry that stops matching outlives what
 * it excused and is reported in its own right
 * @returns {string | undefined} a reviewable report, or nothing when all conform
 */
const reportAnalyzableConformance = (subjects, expected = []) => {
	/** @type {string[]} */
	const lines = [];
	const matched = new Set();
	for (const { compilation, name } of subjects) {
		for (const finding of checkAnalyzableConformance(compilation)) {
			const line = name ? `${name}: ${finding}` : finding;
			const declared = expected.find((pattern) => pattern.test(line));
			if (declared) {
				matched.add(declared);
				continue;
			}
			lines.push(line);
		}
	}
	const stale = expected.filter((pattern) => !matched.has(pattern));
	if (lines.length === 0 && stale.length === 0) return undefined;
	return [
		lines.length > 0 &&
			`ESM output a foreign bundler cannot follow:\n  ${lines.join("\n  ")}`,
		stale.length > 0 &&
			`analyzableConformanceExpected matches nothing any more, remove it:\n  ${stale.join(
				"\n  "
			)}`
	]
		.filter(Boolean)
		.join("\n");
};

module.exports = {
	checkAnalyzableConformance,
	literalSpecifiersOf,
	recordedBailoutsOf,
	reportAnalyzableConformance
};
