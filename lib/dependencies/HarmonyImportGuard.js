/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

const { InlinedUsedName } = require("../optimize/InlineExports");
const memoize = require("../util/memoize");

/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../util/runtime").RuntimeSpec} RuntimeSpec */
/** @typedef {import("./CommonJsRequireDependency")} CommonJsRequireDependency */
/** @typedef {import("./HarmonyImportSpecifierDependency")} HarmonyImportSpecifierDependency */
/** @typedef {import("./ImportDependency")} ImportDependency */

// Tuple-encoded boolean formula over guard dependencies. Split into per-shape
// aliases so the recursive references resolve through array/object types.
/** @typedef {["v", Dependency]} GuardAtom */
/** @typedef {["?"]} GuardUnknown */
/** @typedef {["!", GuardFormula]} GuardNot */
/** @typedef {["&&" | "||" | "??", GuardFormula, GuardFormula]} GuardLogical */
/** @typedef {GuardAtom | GuardUnknown | GuardNot | GuardLogical} GuardFormula */
/** @typedef {{ formula: GuardFormula, value: boolean }} DependencyGuard branch guard: the dependency is live only when the formula evaluates to `value` */
/** @typedef {HarmonyImportSpecifierDependency | CommonJsRequireDependency | ImportDependency} GuardableDependency */

/**
 * A guard frame pushed onto `parser.state.guardStack` for the duration of one
 * conditional branch body. Carries the `"x" in ns` presence guards and/or the
 * dead-branch dependency guard for that branch.
 * @typedef {object} GuardFrame
 * @property {Map<string, Set<string>>=} presence `"x" in ns` presence guards active in this branch
 * @property {Expression=} test the conditional test (for the lazily built formula)
 * @property {number=} depStart dependency count before the test was walked
 * @property {boolean=} condition branch truthiness the dependency guard is live for
 * @property {GuardFormula | null=} formula memoized formula (null = no knowable atom)
 */

const getHarmonyImportSpecifierDependency = memoize(() =>
	require("./HarmonyImportSpecifierDependency")
);

// Tri-state truthiness: UNKNOWN means not statically known.
const UNKNOWN = 0;
const FALSE = 1;
const TRUE = 2;

/**
 * @param {number} t tri-state value
 * @returns {number} negated tri-state
 */
const flip = (t) => (t === TRUE ? FALSE : t === FALSE ? TRUE : UNKNOWN);

/**
 * @param {boolean} b boolean
 * @returns {number} tri-state value
 */
const fromBool = (b) => (b ? TRUE : FALSE);

/**
 * Build a guard formula from a conditional test AST.
 * @param {Expression} test conditional test expression
 * @param {Map<number, HarmonyImportSpecifierDependency>} depByRangeStart import-specifier deps in the test, keyed by range start
 * @returns {GuardFormula | null} formula, or null when it has no knowable atom
 */
const buildGuardFormula = (test, depByRangeStart) => {
	/**
	 * @param {Expression} node ast node
	 * @returns {GuardFormula} formula node
	 */
	const build = (node) => {
		if (node.type === "UnaryExpression" && node.operator === "!") {
			return ["!", build(/** @type {Expression} */ (node.argument))];
		}
		if (
			node.type === "LogicalExpression" &&
			(node.operator === "&&" ||
				node.operator === "||" ||
				node.operator === "??")
		) {
			return [
				node.operator,
				build(/** @type {Expression} */ (node.left)),
				build(/** @type {Expression} */ (node.right))
			];
		}
		const dep =
			node.range && depByRangeStart.get(/** @type {number} */ (node.range[0]));
		return dep ? ["v", dep] : ["?"];
	};

	const formula = build(test);
	return hasAtom(formula) ? formula : null;
};

/**
 * @param {GuardFormula} formula formula
 * @returns {boolean} true when the formula contains at least one atom
 */
const hasAtom = (formula) => {
	switch (formula[0]) {
		case "v":
			return true;
		case "!":
			return hasAtom(formula[1]);
		case "&&":
		case "||":
		case "??":
			return hasAtom(formula[1]) || hasAtom(formula[2]);
		default:
			return false;
	}
};

/**
 * @param {GuardFormula} formula formula
 * @param {ModuleGraph} moduleGraph module graph
 * @param {RuntimeSpec} runtime runtime
 * @returns {{ t: number, n: number }} truthy `t` and null `n` tri-states
 */
const evalNode = (formula, moduleGraph, runtime) => {
	switch (formula[0]) {
		case "v": {
			const dep = /** @type {HarmonyImportSpecifierDependency} */ (formula[1]);
			const module = moduleGraph.getModule(dep);
			if (!module) return { t: UNKNOWN, n: UNKNOWN };
			const used = moduleGraph
				.getExportsInfo(module)
				.getUsedName(dep.getIds(moduleGraph), runtime);
			// Only a bare inlined primitive is knowable; a property suffix is not.
			if (!(used instanceof InlinedUsedName) || used.suffix.length !== 0) {
				return { t: UNKNOWN, n: UNKNOWN };
			}
			const value = used.value;
			const nullish = value.kind === "null" || value.kind === "undefined";
			return {
				t: fromBool(!nullish && Boolean(value.value)),
				n: fromBool(nullish)
			};
		}
		case "!":
			// `!x` always yields a boolean → never nullish.
			return {
				t: flip(evalNode(formula[1], moduleGraph, runtime).t),
				n: FALSE
			};
		case "&&": {
			const l = evalNode(formula[1], moduleGraph, runtime);
			const r = evalNode(formula[2], moduleGraph, runtime);
			const t =
				l.t === FALSE || r.t === FALSE
					? FALSE
					: l.t === TRUE && r.t === TRUE
						? TRUE
						: UNKNOWN;
			return { t, n: UNKNOWN };
		}
		case "||": {
			const l = evalNode(formula[1], moduleGraph, runtime);
			const r = evalNode(formula[2], moduleGraph, runtime);
			const t =
				l.t === TRUE || r.t === TRUE
					? TRUE
					: l.t === FALSE && r.t === FALSE
						? FALSE
						: UNKNOWN;
			return { t, n: UNKNOWN };
		}
		case "??": {
			const l = evalNode(formula[1], moduleGraph, runtime);
			const r = evalNode(formula[2], moduleGraph, runtime);
			// `l ?? r` is l when l non-nullish, else r.
			const t =
				l.n === FALSE ? l.t : l.n === TRUE ? r.t : l.t === r.t ? l.t : UNKNOWN;
			return { t, n: UNKNOWN };
		}
		default:
			return { t: UNKNOWN, n: UNKNOWN };
	}
};

/**
 * Whether any guard proves its branch dead.
 * @param {DependencyGuard[]} guards dependency guards
 * @param {ModuleGraph} moduleGraph module graph
 * @param {RuntimeSpec} runtime runtime
 * @returns {boolean} true when a test is provably the opposite of its branch
 */
const isDeadByGuards = (guards, moduleGraph, runtime) => {
	for (const guard of guards) {
		const t = evalNode(guard.formula, moduleGraph, runtime).t;
		if (t !== UNKNOWN && t !== (guard.value ? TRUE : FALSE)) return true;
	}
	return false;
};

/**
 * Builds (once) the dependency-guard formula for a frame from the import
 * specifier deps created while walking the test.
 * @param {JavascriptParser} parser the parser
 * @param {GuardFrame} frame guard frame
 * @returns {GuardFormula | null} formula, or null when it has no knowable atom
 */
const buildFrameFormula = (parser, frame) => {
	const HarmonyImportSpecifierDependency =
		getHarmonyImportSpecifierDependency();
	const deps = /** @type {Module} */ (parser.state.module).dependencies;
	/** @type {Map<number, HarmonyImportSpecifierDependency>} */
	const depByRangeStart = new Map();
	for (let i = /** @type {number} */ (frame.depStart); i < deps.length; i++) {
		const dep = deps[i];
		if (dep instanceof HarmonyImportSpecifierDependency && dep.range) {
			depByRangeStart.set(dep.range[0], dep);
		}
	}
	return buildGuardFormula(
		/** @type {Expression} */ (frame.test),
		depByRangeStart
	);
};

/**
 * Tags a freshly created dependency with the active dependency guards.
 * @param {JavascriptParser} parser the parser
 * @param {GuardableDependency} dep the dependency
 */
const attachDependencyGuards = (parser, dep) => {
	const stack = /** @type {GuardFrame[] | undefined} */ (
		parser.state.guardStack
	);
	if (stack === undefined || stack.length === 0) return;
	/** @type {DependencyGuard[] | undefined} */
	let guards;
	for (const frame of stack) {
		if (frame.depStart === undefined) continue;
		let formula = frame.formula;
		if (formula === undefined) {
			formula = frame.formula = buildFrameFormula(parser, frame);
		}
		if (formula === null) continue;
		(guards || (guards = [])).push({
			formula,
			value: /** @type {boolean} */ (frame.condition)
		});
	}
	if (guards !== undefined) dep.branchGuards = guards;
};

module.exports.attachDependencyGuards = attachDependencyGuards;
module.exports.isDeadByGuards = isDeadByGuards;
