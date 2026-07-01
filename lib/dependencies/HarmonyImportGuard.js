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
/** @typedef {import("./HarmonyEvaluatedImportSpecifierDependency")} HarmonyEvaluatedImportSpecifierDependency */
/** @typedef {import("./HarmonyImportSpecifierDependency")} HarmonyImportSpecifierDependency */
/** @typedef {import("./ImportDependency")} ImportDependency */

// Tuple-encoded boolean formula over guard dependencies. Split into per-shape
// aliases so the recursive references resolve through array/object types.
// `v` = dependency-liveness atom, `p` = `"x" in ns` presence atom.
/** @typedef {["v", Dependency]} GuardAtom */
/** @typedef {["p", HarmonyEvaluatedImportSpecifierDependency]} GuardPresenceAtom */
/** @typedef {["?"]} GuardUnknown */
/** @typedef {["!", GuardFormula]} GuardNot */
/** @typedef {["&&" | "||" | "??", GuardFormula, GuardFormula]} GuardLogical */
/** @typedef {GuardAtom | GuardPresenceAtom | GuardUnknown | GuardNot | GuardLogical} GuardFormula */
/** @typedef {{ formula: GuardFormula, value: boolean }} DependencyGuard branch guard: the dependency is live only when the formula evaluates to `value` */
/** @typedef {HarmonyImportSpecifierDependency | CommonJsRequireDependency | ImportDependency} GuardableDependency */

/**
 * A guard frame pushed onto `parser.state.guardStack` for the duration of one
 * conditional branch body. Carries the `"x" in ns` presence guards and/or the
 * dead-branch dependency guard for that branch.
 * @typedef {object} GuardFrame
 * @property {Expression=} test the conditional test (for the lazily built formula)
 * @property {number=} depStart dependency count before the test was walked
 * @property {boolean=} condition branch truthiness the dependency guard is live for
 * @property {GuardFormula | null=} formula memoized dependency-guard formula (null = no knowable atom)
 * @property {GuardFormula | null=} presenceFormula memoized presence formula (null = no presence atom)
 */

const getHarmonyImportSpecifierDependency = memoize(() =>
	require("./HarmonyImportSpecifierDependency")
);
const getHarmonyEvaluatedImportSpecifierDependency = memoize(() =>
	require("./HarmonyEvaluatedImportSpecifierDependency")
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
 * Build a liveness formula from a conditional test AST.
 * @param {Expression} test conditional test expression
 * @param {Map<number, HarmonyImportSpecifierDependency>} depByRangeStart import-specifier deps in the test, keyed by range start
 * @returns {GuardFormula | null} formula, or null when it has no knowable atom
 */
const buildLivenessFormula = (test, depByRangeStart) => {
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
		case "p":
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
const evalLivenessFormula = (formula, moduleGraph, runtime) => {
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
				t: flip(evalLivenessFormula(formula[1], moduleGraph, runtime).t),
				n: FALSE
			};
		case "&&": {
			const l = evalLivenessFormula(formula[1], moduleGraph, runtime);
			const r = evalLivenessFormula(formula[2], moduleGraph, runtime);
			const t =
				l.t === FALSE || r.t === FALSE
					? FALSE
					: l.t === TRUE && r.t === TRUE
						? TRUE
						: UNKNOWN;
			return { t, n: UNKNOWN };
		}
		case "||": {
			const l = evalLivenessFormula(formula[1], moduleGraph, runtime);
			const r = evalLivenessFormula(formula[2], moduleGraph, runtime);
			const t =
				l.t === TRUE || r.t === TRUE
					? TRUE
					: l.t === FALSE && r.t === FALSE
						? FALSE
						: UNKNOWN;
			return { t, n: UNKNOWN };
		}
		case "??": {
			const l = evalLivenessFormula(formula[1], moduleGraph, runtime);
			const r = evalLivenessFormula(formula[2], moduleGraph, runtime);
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
		const t = evalLivenessFormula(guard.formula, moduleGraph, runtime).t;
		if (t !== UNKNOWN && t !== (guard.value ? TRUE : FALSE)) return true;
	}
	return false;
};

/**
 * Builds (once) the liveness formula for a frame from the import specifier deps
 * created while walking the test.
 * @param {JavascriptParser} parser the parser
 * @param {GuardFrame} frame guard frame
 * @returns {GuardFormula | null} formula, or null when it has no knowable atom
 */
const buildFrameLivenessFormula = (parser, frame) => {
	const HarmonyImportSpecifierDependency =
		getHarmonyImportSpecifierDependency();
	const HarmonyEvaluatedImportSpecifierDependency =
		getHarmonyEvaluatedImportSpecifierDependency();
	const deps = /** @type {Module} */ (parser.state.module).dependencies;
	/** @type {Map<number, HarmonyImportSpecifierDependency>} */
	const depByRangeStart = new Map();
	for (let i = /** @type {number} */ (frame.depStart); i < deps.length; i++) {
		const dep = deps[i];
		// Exclude `"x" in ns` evaluated deps; those feed the presence formula only.
		if (
			dep instanceof HarmonyImportSpecifierDependency &&
			!(dep instanceof HarmonyEvaluatedImportSpecifierDependency) &&
			dep.range
		) {
			depByRangeStart.set(dep.range[0], dep);
		}
	}
	return buildLivenessFormula(
		/** @type {Expression} */ (frame.test),
		depByRangeStart
	);
};

/**
 * Build a presence formula from a conditional test AST. Statically-decided
 * `||`/`??` operands are folded away at build time, so the result contains only
 * `"x" in ns` presence atoms (plus `&&`/`!`).
 * @param {JavascriptParser} parser the parser
 * @param {Expression} test conditional test expression
 * @param {Map<number, HarmonyEvaluatedImportSpecifierDependency>} depByRangeStart in-operator deps in the test, keyed by range start
 * @returns {GuardFormula | null} formula, or null when it has no presence atom
 */
const buildPresenceFormula = (parser, test, depByRangeStart) => {
	/**
	 * @param {Expression} node ast node
	 * @returns {GuardFormula} formula node
	 */
	const build = (node) => {
		if (node.type === "UnaryExpression" && node.operator === "!") {
			return ["!", build(/** @type {Expression} */ (node.argument))];
		}
		if (node.type === "LogicalExpression") {
			if (node.operator === "&&") {
				return [
					"&&",
					build(/** @type {Expression} */ (node.left)),
					build(/** @type {Expression} */ (node.right))
				];
			}

			if (node.operator === "||") {
				if (parser.evaluateExpression(node.left).asBool() === false) {
					return build(/** @type {Expression} */ (node.right));
				}
				if (parser.evaluateExpression(node.right).asBool() === false) {
					return build(/** @type {Expression} */ (node.left));
				}
				return ["?"];
			}

			if (node.operator === "??") {
				const nullish = parser.evaluateExpression(node.left).asNullish();
				if (nullish === true) {
					return build(/** @type {Expression} */ (node.right));
				}
				if (nullish === false) {
					return build(/** @type {Expression} */ (node.left));
				}
				return ["?"];
			}
		}
		const dep =
			node.range && depByRangeStart.get(/** @type {number} */ (node.range[0]));
		return dep ? ["p", dep] : ["?"];
	};

	const formula = build(test);
	return hasAtom(formula) ? formula : null;
};

/**
 * Whether a presence formula guarantees `ns.member` is present. "Must be truthy"
 * semantics: the member is guaranteed when some `"member" in ns` atom must hold
 * for the branch condition. Statically-dead branches never reach here — the
 * parser eliminates them before the branch body is walked.
 * @param {GuardFormula} formula presence formula
 * @param {string} name namespace binding name
 * @param {string} member member key
 * @param {boolean} needTruthy whether the formula must be truthy
 * @returns {boolean} true when the member is guaranteed present
 */
const evalPresenceFormula = (formula, name, member, needTruthy) => {
	switch (formula[0]) {
		case "p": {
			const dep = /** @type {HarmonyEvaluatedImportSpecifierDependency} */ (
				formula[1]
			);
			return (
				needTruthy &&
				dep.directImport === true &&
				dep.name === name &&
				dep.ids.length === 1 &&
				dep.ids[0] === member
			);
		}
		case "!":
			return evalPresenceFormula(formula[1], name, member, !needTruthy);
		case "&&":
			return (
				needTruthy &&
				(evalPresenceFormula(formula[1], name, member, true) ||
					evalPresenceFormula(formula[2], name, member, true))
			);
		default:
			return false;
	}
};

/**
 * Builds (once) the presence formula for a frame from the in-operator deps
 * created while walking the test.
 * @param {JavascriptParser} parser the parser
 * @param {GuardFrame} frame guard frame
 * @returns {GuardFormula | null} formula, or null when it has no presence atom
 */
const buildFramePresenceFormula = (parser, frame) => {
	const HarmonyEvaluatedImportSpecifierDependency =
		getHarmonyEvaluatedImportSpecifierDependency();
	const deps = /** @type {Module} */ (parser.state.module).dependencies;
	/** @type {Map<number, HarmonyEvaluatedImportSpecifierDependency>} */
	const depByRangeStart = new Map();
	for (let i = /** @type {number} */ (frame.depStart); i < deps.length; i++) {
		const dep = deps[i];
		if (dep instanceof HarmonyEvaluatedImportSpecifierDependency && dep.range) {
			depByRangeStart.set(dep.range[0], dep);
		}
	}
	return buildPresenceFormula(
		parser,
		/** @type {Expression} */ (frame.test),
		depByRangeStart
	);
};

/**
 * Whether an active presence guard proves `ns.member` present, suppressing
 * export-presence errors. Each frame is evaluated against its branch condition,
 * so the `else` of `if (!("x" in ns))` also guards `ns.x`.
 * @param {JavascriptParser} parser the parser
 * @param {GuardFrame[]} stack the guard stack
 * @param {string} name namespace binding name
 * @param {string} member member key
 * @returns {boolean} true when a guard proves the member present
 */
const isPresentByGuards = (parser, stack, name, member) => {
	for (let i = stack.length - 1; i >= 0; i--) {
		const frame = stack[i];
		if (frame.depStart === undefined) continue;
		let formula = frame.presenceFormula;
		if (formula === undefined) {
			formula = frame.presenceFormula = buildFramePresenceFormula(
				parser,
				frame
			);
		}
		if (
			formula !== null &&
			evalPresenceFormula(
				formula,
				name,
				member,
				/** @type {boolean} */ (frame.condition)
			)
		) {
			return true;
		}
	}
	return false;
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
			formula = frame.formula = buildFrameLivenessFormula(parser, frame);
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
module.exports.isPresentByGuards = isPresentByGuards;
