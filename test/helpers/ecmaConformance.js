"use strict";

// Holds webpack's own generated code to what `output.environment` says the
// target can parse. Nothing here names an ECMAScript version by hand: the
// ladder and every flag on it are read back out of the `esX` preset in
// `lib/config/target.js`, so a flag added there is covered here or the check
// throws rather than passing quietly.

const acorn = require("acorn");
const { getTargetProperties } = require("../../lib/config/target");

/** @typedef {Record<string, boolean | undefined>} Environment */
/**
 * @typedef {object} Subject
 * @property {string} code the generated JavaScript
 * @property {Environment} environment what it was generated for
 * @property {("script" | "module")=} sourceType how the target loads it
 * @property {boolean=} asyncWarned the build raised `EnvironmentNotSupportAsyncWarning`, so it has already reported what an `asyncFunction` finding here would say again
 * @property {string=} name what to call it in a report
 */

// Highest version the `esX` preset models — beyond it every flag reads the
// same, so a higher number would only buy leniency acorn should not have.
const CEILING = 2030;

// Each version at which `esX` changes its answer, newest first. Anything
// between two rungs is the lower one, which is what makes the search below a
// plain descending scan.
const ES_VERSIONS = (() => {
	/** @type {number[]} */
	const versions = [];
	let previous;
	for (let version = 2015; version <= CEILING; version++) {
		const signature = JSON.stringify(getTargetProperties(`es${version}`, "/"));
		if (signature !== previous) versions.push(version);
		previous = signature;
	}
	return [5, ...versions].reverse();
})();

/**
 * Syntax `output.environment` states the availability of, by the shape the
 * parser gives it. A flag missing from here and from `NON_SYNTAX` below is a
 * flag nobody has classified, which `assertEveryFlagClassified` rejects.
 * @type {[string, (node: EXPECTED_ANY, inFunction: boolean) => boolean][]}
 */
const SYNTAX = [
	["arrowFunction", (node) => node.type === "ArrowFunctionExpression"],
	[
		"asyncFunction",
		(node) =>
			node.async === true ||
			node.type === "AwaitExpression" ||
			(node.type === "ForOfStatement" && node.await === true)
	],
	[
		"bigIntLiteral",
		(node) => node.type === "Literal" && typeof node.bigint === "string"
	],
	[
		"const",
		(node) => node.type === "VariableDeclaration" && node.kind === "const"
	],
	["let", (node) => node.type === "VariableDeclaration" && node.kind === "let"],
	[
		"destructuring",
		(node) =>
			node.type === "ObjectPattern" ||
			node.type === "ArrayPattern" ||
			node.type === "AssignmentPattern"
	],
	["dynamicImport", (node) => node.type === "ImportExpression"],
	["forOf", (node) => node.type === "ForOfStatement"],
	[
		"generator",
		(node) => node.generator === true || node.type === "YieldExpression"
	],
	[
		"logicalAssignment",
		(node) =>
			node.type === "AssignmentExpression" &&
			(node.operator === "||=" ||
				node.operator === "&&=" ||
				node.operator === "??=")
	],
	[
		"module",
		(node) =>
			node.type === "ImportDeclaration" ||
			node.type === "ExportNamedDeclaration" ||
			node.type === "ExportDefaultDeclaration" ||
			node.type === "ExportAllDeclaration" ||
			// `import.meta`, not `new.target`
			(node.type === "MetaProperty" && node.meta.name === "import")
	],
	[
		"methodShorthand",
		(node) => node.type === "Property" && node.method === true
	],
	["optionalChaining", (node) => node.type === "ChainExpression"],
	[
		"spread",
		(node) => node.type === "SpreadElement" || node.type === "RestElement"
	],
	["templateLiteral", (node) => node.type === "TemplateLiteral"],
	[
		"topLevelAwait",
		(node, inFunction) =>
			!inFunction &&
			(node.type === "AwaitExpression" ||
				(node.type === "ForOfStatement" && node.await === true))
	]
];

// Capabilities of the standard library, not of the grammar. A parser cannot
// see them and a guarded use (`typeof Symbol !== 'undefined' && …`) is
// correct, so they are answered by running the bundle, not by reading it.
const NON_SYNTAX = new Set([
	"dynamicImportInWorker",
	"globalThis",
	"hasOwn",
	"symbol"
]);

// Syntax a target can lack whatever its ECMAScript version — `electron10-main`
// parses class fields and still cannot load an ES module. Checked one flag at a
// time, never read as evidence of which version the grammar is at.
const VERSION_INDEPENDENT = new Set(["dynamicImport", "module"]);

const SYNTAX_FLAGS = new Set(SYNTAX.map(([flag]) => flag));

// A new `esX` flag is a decision — grammar or library — that only a person can
// make, so make forgetting it loud rather than silent.
const assertEveryFlagClassified = () => {
	const unclassified = Object.keys(getTargetProperties("es5", "/")).filter(
		(flag) => !SYNTAX_FLAGS.has(flag) && !NON_SYNTAX.has(flag)
	);
	if (unclassified.length > 0) {
		throw new Error(
			`test/helpers/ecmaConformance.js does not classify ${unclassified.join(
				", "
			)} as syntax or as a library capability — add it to SYNTAX or NON_SYNTAX`
		);
	}
};

assertEveryFlagClassified();

/**
 * The ECMAScript version the environment *is*, when it is one — what the syntax
 * carrying no flag of its own (classes, default parameters, `**`, `??`, class
 * fields) is then held to. An environment that turns one grammar flag off is
 * not a version and gets no answer: `templateLiteral: false` alone says the
 * target has no template literals, not that it is pre-ES2015 and has lost
 * arrow functions too. Flags that say nothing about the grammar
 * (`globalThis`) or that a target can lack at any version (`module`,
 * `dynamicImport`) sit outside the comparison.
 * @param {Environment} environment resolved `output.environment`
 * @returns {number | undefined} an acorn `ecmaVersion`, or nothing when the
 * environment matches no version
 */
const ecmaVersionOf = (environment) => {
	for (const version of ES_VERSIONS) {
		const properties =
			/** @type {Record<string, boolean | undefined>} */
			(getTargetProperties(`es${version}`, "/"));
		const matches = Object.keys(properties).every(
			(flag) =>
				NON_SYNTAX.has(flag) ||
				VERSION_INDEPENDENT.has(flag) ||
				Boolean(environment[flag]) === properties[flag]
		);
		if (matches) return version;
	}
	return undefined;
};

// `await` is the one construct whose legality depends on what encloses it, so
// the walk carries that much context.
const FUNCTION_TYPES = new Set([
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression"
]);

/**
 * @param {EXPECTED_ANY} node any AST node, array of them, or neither
 * @param {(node: EXPECTED_ANY, inFunction: boolean) => void} visit called once per node
 * @param {boolean=} inFunction the node sits inside a function
 */
const walk = (node, visit, inFunction = false) => {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const child of node) walk(child, visit, inFunction);
		return;
	}
	if (typeof node.type === "string") visit(node, inFunction);
	const nested = inFunction || FUNCTION_TYPES.has(node.type);
	for (const key of Object.keys(node)) {
		if (key === "type" || key === "loc" || key === "start" || key === "end") {
			continue;
		}
		walk(node[key], visit, nested);
	}
};

// A runtime module is a fragment of the bundle it is spliced into, so a name it
// exports is declared in another fragment and acorn's whole-module check would
// reject code the engine accepts.
const FragmentParser = acorn.Parser.extend(
	(Parser) =>
		class extends Parser {
			checkLocalExport() {}
		}
);

/**
 * @param {string} code generated JavaScript
 * @param {"script" | "module"} sourceType how the target loads it
 * @param {number | "latest"} ecmaVersion version to hold it to
 * @returns {EXPECTED_ANY} the program
 */
const parse = (code, sourceType, ecmaVersion) =>
	FragmentParser.parse(code, {
		ecmaVersion: /** @type {import("acorn").ecmaVersion} */ (ecmaVersion),
		sourceType,
		locations: true,
		allowReturnOutsideFunction: true,
		allowAwaitOutsideFunction: true,
		allowSuperOutsideMethod: true
	});

/**
 * Every way the code outruns its environment, as reviewable one-liners.
 * @param {Subject} subject the generated code and what it was generated for
 * @returns {string[]} violations, empty when the code conforms
 */
const checkEcmaConformance = ({ code, environment, sourceType = "script" }) => {
	const version = ecmaVersionOf(environment);
	/** @type {string[]} */
	const violations = [];
	let ast;
	/** @type {string | undefined} */
	let outranVersion;
	// Conforming code parses at its own version, which is the common case and
	// the only one that has to be fast.
	try {
		ast = parse(code, sourceType, version === undefined ? "latest" : version);
	} catch (err) {
		outranVersion = `not ES${version}: ${/** @type {Error} */ (err).message}`;
		try {
			ast = parse(code, sourceType, "latest");
		} catch (error) {
			return [`does not parse at all: ${/** @type {Error} */ (error).message}`];
		}
	}
	walk(ast, (node, inFunction) => {
		for (const [flag, matches] of SYNTAX) {
			if (environment[flag] === false && matches(node, inFunction)) {
				violations.push(
					`${node.loc.start.line}:${node.loc.start.column} ${node.type} needs output.environment.${flag}`
				);
			}
		}
	});
	// Only when no flag explains it: syntax carrying no flag (classes, shorthand
	// properties, default parameters, `**`, `??`) is caught here, and reporting
	// it next to the flag that already named it reads as two findings for one
	// line.
	if (violations.length === 0 && outranVersion) violations.push(outranVersion);
	return violations;
};

// The one warning webpack raises about generated code outrunning its target:
// a module it can lower to neither `async` nor a generator. A build that says
// so has already reported what this check would report again.
const ASYNC_WARNING = "EnvironmentNotSupportAsyncWarning";

const JAVASCRIPT_ASSET = /\.[cm]?js$/;

/**
 * Taps every config so what it generates is remembered, keyed by identifier —
 * a suite that compiles the same config three times collects one entry per
 * subject, not three.
 *
 * Runtime modules are always collected: they are webpack's code start to
 * finish, so no case has to opt in. Whole assets only when `assets` is set,
 * because an asset also carries the case's own sources, which are only held to
 * the target's environment where the case says they were written for it.
 * @param {EXPECTED_ANY[]} optionsArr the configs about to be compiled
 * @param {{ assets?: boolean }=} options what to collect
 * @returns {Map<string, Subject>} filled as each build renders
 */
const collectGeneratedCode = (optionsArr, options = {}) => {
	/** @type {Map<string, Subject>} */
	const collected = new Map();
	// Keyed by the config's index, not by `compilation.name`: a runtime module's
	// identifier is the same in every compilation of a multi-config case, and an
	// unnamed config has no name to tell them apart either.
	for (const [index, config] of optionsArr.entries()) {
		if (!config.plugins) config.plugins = [];
		config.plugins.push({
			apply(/** @type {EXPECTED_ANY} */ compiler) {
				compiler.hooks.compilation.tap(
					"EcmaConformance",
					(/** @type {EXPECTED_ANY} */ compilation) => {
						// After processing: the hash is final, so a runtime module that
						// embeds it has generated its real code by now.
						compilation.hooks.afterProcessAssets.tap("EcmaConformance", () => {
							const { environment, module } = compilation.outputOptions;
							const sourceType = module === true ? "module" : "script";
							// Read here rather than from the stats: `name` is a property
							// of the warning object and the stats factory drops it.
							const asyncWarned = compilation.warnings.some(
								(/** @type {Error} */ warning) => warning.name === ASYNC_WARNING
							);
							for (const chunk of compilation.chunks) {
								const entryOptions = chunk.getEntryOptions();
								// A worklet chunk goes to `addModule()`, so it is an ES module
								// whatever `output.module` says — the same rule
								// `AutoPublicPathRuntimeModule` reads before writing
								// `import.meta.url` into it.
								const worklet = Boolean(entryOptions && entryOptions.worklet);
								for (const runtimeModule of compilation.chunkGraph.getChunkRuntimeModulesIterable(
									chunk
								)) {
									let code;
									try {
										code = runtimeModule.getGeneratedCode();
									} catch (_err) {
										// A runtime module that cannot render is already one of
										// the build's errors; there is no code to read.
										continue;
									}
									if (!code) continue;
									collected.set(`${index} ${runtimeModule.identifier()}`, {
										code,
										environment: worklet
											? { ...environment, module: true }
											: environment,
										sourceType: worklet ? "module" : sourceType,
										asyncWarned,
										name: runtimeModule.constructor.name
									});
								}
							}
							if (!options.assets) return;
							for (const name of Object.keys(compilation.assets)) {
								if (!JAVASCRIPT_ASSET.test(name)) continue;
								collected.set(`${index} asset ${name}`, {
									code: compilation.assets[name].source().toString(),
									environment,
									sourceType,
									asyncWarned,
									name
								});
							}
						});
					}
				);
			}
		});
	}
	return collected;
};

/**
 * @param {Iterable<Subject>} subjects generated code to hold to its environment
 * @param {RegExp[]=} expected findings the case declares as deliberate, each of
 * which must still match something — an entry that stops matching outlives what
 * it excused and is reported in its own right
 * @returns {string | undefined} a reviewable report, or nothing when all conform
 */
const reportEcmaConformance = (subjects, expected = []) => {
	/** @type {string[]} */
	const lines = [];
	const matched = new Set();
	for (const subject of subjects) {
		for (const violation of checkEcmaConformance(subject)) {
			// The build already reported this one, and the case's warnings.js
			// declares it.
			if (
				subject.asyncWarned &&
				violation.includes("output.environment.asyncFunction")
			) {
				continue;
			}
			const line = `${subject.name}: ${violation}`;
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
			`Generated code outruns output.environment:\n  ${lines.join("\n  ")}`,
		stale.length > 0 &&
			`ecmaConformanceExpected matches nothing any more, remove it:\n  ${stale.join(
				"\n  "
			)}`
	]
		.filter(Boolean)
		.join("\n");
};

module.exports = {
	ES_VERSIONS,
	checkEcmaConformance,
	collectGeneratedCode,
	ecmaVersionOf,
	reportEcmaConformance
};
