/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/* eslint-disable camelcase -- terser's own API, which this speaks */

// cspell:ignore DEFMETHOD, argnames, Funarg

/** @typedef {import("./syntax-printer").TerserModules} TerserModules */
/** @typedef {EXPECTED_ANY} Node one of terser's nodes */
/** @typedef {EXPECTED_ANY} Compressor terser's compressor */
/** @typedef {EXPECTED_ANY} OutputStream terser's output stream */
/** @typedef {(this: Node, compressor: Compressor) => Node} Optimize a node's `optimize` */
/** @typedef {{ enabled: boolean }} Corrections the switch the corrections read */

// The xxhash64 of each terser file holding what the corrections below amend,
// each run of whitespace read as one space: the one version they were written against.
const TERSER_SOURCES = {
	"output.js": "4d3bcaa64d1d635e",
	"compress/common.js": "b81664f0b8802401",
	"compress/index.js": "6694100e9c5ecfcb",
	"compress/inference.js": "bac5bd59706dc14a",
	"compress/inline.js": "b3b79b0d1e73d807",
	"compress/tighten-body.js": "6034b2093bceae94"
};

/**
 * The xxhash64 of each of terser's files the corrections amend.
 * @returns {Record<string, string>} each file's hash, by its path in `lib`
 */
const hashTerserSources = () => {
	const fs = require("fs");
	const path = require("path");
	const createHash = require("../util/createHash");

	const directory = path.join(
		path.dirname(require.resolve("terser/package.json")),
		"lib"
	);
	/** @type {Record<string, string>} */
	const hashes = {};
	for (const file of Object.keys(TERSER_SOURCES)) {
		hashes[file] = createHash("xxhash64")
			.update(
				fs.readFileSync(path.join(directory, file), "utf8").replace(/\s+/g, " ")
			)
			.digest("hex");
	}
	return hashes;
};

/**
 * Whether the installed terser is the one the corrections were written against.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const correctFits = (modules) => {
	if (!modules.common || !modules.ast) return false;
	try {
		const hashes = hashTerserSources();
		return Object.keys(TERSER_SOURCES).every(
			(file) =>
				hashes[file] ===
				TERSER_SOURCES[/** @type {keyof typeof TERSER_SOURCES} */ (file)]
		);
	} catch (_err) {
		return false;
	}
};

/**
 * Runs `run` with some of the compressor's options off, so the transforms they
 * gate are skipped for this node alone.
 * @template T
 * @param {Compressor} compressor the compressor
 * @param {string[]} names the options
 * @param {() => T} run what to run
 * @returns {T} what it returned
 */
const withOptionsOff = (compressor, names, run) => {
	const { options } = compressor;
	const saved = names.map((name) => options[name]);
	for (const name of names) options[name] = false;
	try {
		return run();
	} finally {
		for (let i = 0; i < names.length; i++) options[names[i]] = saved[i];
	}
};

/**
 * Installs webpack's corrections to terser: each wraps the terser method
 * producing a wrong output, and changes its answer only where it was wrong.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installCorrect = (modules) => {
	const A = modules.ast;
	const { is_empty: isEmpty } = modules.common;
	/** @type {Corrections} */
	const corrections = { enabled: true };
	modules.corrections = corrections;

	/**
	 * @param {Node} prototype a node class's prototype
	 * @param {(original: Optimize) => Optimize} wrap builds the replacement
	 * @returns {void}
	 */
	const wrapOptimize = (prototype, wrap) => {
		const original = prototype.optimize;
		const corrected = wrap(original);
		prototype.optimize = function optimize(
			/** @type {Compressor} */ compressor
		) {
			return corrections.enabled
				? corrected.call(this, compressor)
				: original.call(this, compressor);
		};
	};

	/**
	 * Whether a property is `__proto__` written as a shorthand, an own property
	 * rather than the prototype: its one token is both its start and its end.
	 * @param {Node} property an object literal's property
	 * @returns {boolean} true for `{ __proto__ }`
	 */
	const isShorthandProto = (property) =>
		property.key === "__proto__" &&
		Boolean(property.start) &&
		property.start === property.end;

	/**
	 * Whether a property sets the object's prototype: `__proto__: value`.
	 * @param {Node} property an object literal's property
	 * @returns {boolean} true for a prototype setter
	 */
	const setsPrototype = (property) =>
		property instanceof A.AST_ObjectKeyVal &&
		property.key === "__proto__" &&
		!isShorthandProto(property);

	// `{ __proto__ }` is an own property and `{ __proto__: x }` the prototype, a
	// difference terser's tree keeps only in the tokens, so print by them.
	const codegen = A.AST_ObjectKeyVal.prototype._codegen;
	A.AST_ObjectKeyVal.prototype._codegen = function _codegen(
		/** @type {Node} */ self,
		/** @type {OutputStream} */ output
	) {
		if (
			!corrections.enabled ||
			self.key !== "__proto__" ||
			!(output.parent() instanceof A.AST_Object)
		) {
			return codegen.call(this, self, output);
		}
		const { value } = self;
		const definition =
			value instanceof A.AST_Symbol && typeof value.definition === "function"
				? value.definition()
				: undefined;
		const printedName =
			value instanceof A.AST_Symbol
				? definition
					? definition.mangled_name || definition.name
					: value.name
				: undefined;
		const asShorthand =
			printedName === "__proto__" && output.option("shorthand");
		if (isShorthandProto(self)) {
			if (asShorthand) {
				output.print_name("__proto__");
			} else {
				output.with_square(() => output.print_string("__proto__"));
				output.colon();
				value.print(output);
			}
			return;
		}
		if (!asShorthand) return codegen.call(this, self, output);
		output.print_name("__proto__");
		output.colon();
		value.print(output);
	};

	// Spreading `{ __proto__: p }` copies none of `p`, where writing its
	// properties into the outer literal would set that literal's prototype.
	wrapOptimize(
		A.AST_Object.prototype,
		(original) =>
			function optimize(compressor) {
				/** @type {[Node, Node][]} */
				const kept = [];
				for (const property of this.properties) {
					if (
						property instanceof A.AST_Expansion &&
						property.expression instanceof A.AST_Object &&
						property.expression.properties.some(setsPrototype)
					) {
						kept.push([property, property.expression]);
						property.expression = new A.AST_Sequence({
							start: property.expression.start,
							expressions: [property.expression],
							end: property.expression.end
						});
					}
				}
				try {
					return original.call(this, compressor);
				} finally {
					for (const [property, expression] of kept) {
						property.expression = expression;
					}
				}
			}
	);

	// A direct `eval` reads `this` without naming it.
	const containsThis = A.AST_Node.prototype.contains_this;
	A.AST_Node.prototype.contains_this = function contains_this() {
		return (
			containsThis.call(this) ||
			(corrections.enabled && this instanceof A.AST_Scope && this.uses_eval)
		);
	};

	/**
	 * Whether a parameter has a default whose evaluation has effects.
	 * @param {Node} parameter the parameter
	 * @param {Compressor} compressor the compressor
	 * @returns {boolean} true for `(a = f()) => …`
	 */
	const hasDefaultWithEffects = (parameter, compressor) =>
		parameter instanceof A.AST_DefaultAssign &&
		parameter.right.has_side_effects(compressor);

	/**
	 * The options that would drop effects a call's parameters or arguments
	 * still have: inlining or dropping it loses a default or a pattern, and
	 * dropping an empty function's call loses a spread's iteration.
	 * @param {Node} call the call
	 * @param {Compressor} compressor the compressor
	 * @returns {string[]} the options to skip for this call
	 */
	const optionsLosingEffects = (call, compressor) => {
		let fn = call.expression;
		if (fn instanceof A.AST_SymbolRef && typeof fn.fixed_value === "function") {
			fn = fn.fixed_value();
		}
		if (!(fn instanceof A.AST_Lambda)) return [];
		if (
			fn.argnames.some(
				(/** @type {Node} */ parameter) =>
					parameter instanceof A.AST_Destructuring ||
					hasDefaultWithEffects(parameter, compressor) ||
					(parameter instanceof A.AST_Expansion &&
						!(parameter.expression instanceof A.AST_SymbolFunarg))
			)
		) {
			return ["inline", "side_effects"];
		}
		return fn.body.every(isEmpty) &&
			call.args.some(
				(/** @type {Node} */ arg) => arg instanceof A.AST_Expansion
			)
			? ["side_effects"]
			: [];
	};

	/**
	 * Whether a node is what a call or a tag reads its function from.
	 * @param {Node} parent the node's parent
	 * @param {Node} node the node
	 * @returns {boolean} true for `node()` and `` node`…` ``
	 */
	const isCallee = (parent, node) =>
		(parent instanceof A.AST_Call && parent.expression === node) ||
		(parent instanceof A.AST_PrefixedTemplateString && parent.prefix === node);

	/**
	 * Whether calling a node binds `this` to the object it was read from, or
	 * makes a direct `eval`.
	 * @param {Node} node the node
	 * @returns {boolean} true for `a.b`, `a?.b` and `eval`
	 */
	const bindsThis = (node) =>
		node instanceof A.AST_PropAccess ||
		node instanceof A.AST_Chain ||
		(node instanceof A.AST_SymbolRef && node.name === "eval");

	/**
	 * `(0, result)`, which calls `result` unbound.
	 * @param {Node} result what took a callee's place
	 * @returns {Node} the sequence
	 */
	const detached = (result) =>
		new A.AST_Sequence({
			start: result.start,
			expressions: [
				new A.AST_Number({ start: result.start, value: 0, end: result.start }),
				result
			],
			end: result.end
		});

	// A callee replaced by `a.b` must not bind `a`, which the callee it replaces
	// never did; terser keeps the `0,` for a call but not for a tag.
	wrapOptimize(
		A.AST_Call.prototype,
		(original) =>
			function optimize(compressor) {
				const parent = compressor.parent();
				const result = optimizeKeepingEffects(this, compressor, original);
				return result !== this && isCallee(parent, this) && bindsThis(result)
					? detached(result)
					: result;
			}
	);
	for (const Type of [A.AST_Sequence, A.AST_Conditional]) {
		wrapOptimize(
			Type.prototype,
			(original) =>
				function optimize(compressor) {
					const parent = compressor.parent();
					if (
						!(parent instanceof A.AST_PrefixedTemplateString) ||
						parent.prefix !== this
					) {
						return original.call(this, compressor);
					}
					if (
						this instanceof A.AST_Sequence &&
						this.expressions.length === 2 &&
						this.expressions[0] instanceof A.AST_Number &&
						bindsThis(this.expressions[1])
					) {
						return this;
					}
					const result = original.call(this, compressor);
					return result !== this && bindsThis(result)
						? detached(result)
						: result;
				}
		);
	}

	/**
	 * Optimizes a call, keeping the effects its parameters or arguments have.
	 * @param {Node} call the call
	 * @param {Compressor} compressor the compressor
	 * @param {Optimize} original terser's `optimize`
	 * @returns {Node} the optimized call
	 */
	function optimizeKeepingEffects(call, compressor, original) {
		const names = optionsLosingEffects(call, compressor);
		return names.length === 0
			? original.call(call, compressor)
			: withOptionsOff(compressor, names, () =>
					original.call(call, compressor)
				);
	}

	// A sloppy `arguments[i]` follows its parameter only where an argument was
	// passed, so it is the parameter only while nothing reassigns that.
	wrapOptimize(
		A.AST_Sub.prototype,
		(original) =>
			function optimize(compressor) {
				const { expression, property } = this;
				if (
					compressor.option("arguments") &&
					expression instanceof A.AST_SymbolRef &&
					expression.name === "arguments" &&
					expression.scope instanceof A.AST_Lambda &&
					!(expression.scope instanceof A.AST_Arrow) &&
					property instanceof A.AST_Number &&
					!compressor.has_directive("use strict")
				) {
					const parameter = expression.scope.argnames[property.getValue()];
					if (parameter instanceof A.AST_SymbolFunarg) {
						const definition = parameter.definition();
						if (
							!compressor.option("reduce_vars") ||
							definition.assignments ||
							definition.orig.length > 1
						) {
							return withOptionsOff(compressor, ["arguments"], () =>
								original.call(this, compressor)
							);
						}
					}
				}
				return original.call(this, compressor);
			}
	);

	// `===` between two readings of one expression is `==` only where both
	// readings give one value, which a call or property read need not.
	wrapOptimize(
		A.AST_Binary.prototype,
		(original) =>
			function optimize(compressor) {
				const parent = compressor.parent();
				if (
					parent instanceof A.AST_PrefixedTemplateString &&
					parent.prefix === this
				) {
					const result = original.call(this, compressor);
					return result !== this && bindsThis(result)
						? detached(result)
						: result;
				}
				if (
					(this.operator === "===" || this.operator === "!==") &&
					compressor.option("comparisons") &&
					!(this.left instanceof A.AST_SymbolRef) &&
					!(this.left instanceof A.AST_Constant) &&
					this.left.equivalent_to(this.right)
				) {
					return withOptionsOff(compressor, ["comparisons"], () =>
						original.call(this, compressor)
					);
				}
				return original.call(this, compressor);
			}
	);

	/** @type {WeakMap<Compressor, Set<Node>>} */
	const defaultsWithEffects = new WeakMap();

	// terser moves what follows an `if (…) return` into the `if`, leaving `let`
	// and `const` where they are but not `class`, which is block-scoped too.
	for (const Type of [
		A.AST_Block,
		A.AST_BlockStatement,
		A.AST_Lambda,
		A.AST_Arrow,
		A.AST_Function,
		A.AST_ClassStaticBlock
	]) {
		if (!Object.prototype.hasOwnProperty.call(Type.prototype, "optimize")) {
			continue;
		}
		wrapOptimize(
			Type.prototype,
			(original) =>
				function optimize(compressor) {
					if (
						this instanceof A.AST_Lambda &&
						this.argnames.some((/** @type {Node} */ parameter) =>
							hasDefaultWithEffects(parameter, compressor)
						)
					) {
						let lambdas = defaultsWithEffects.get(compressor);
						if (lambdas === undefined) {
							lambdas = new Set();
							defaultsWithEffects.set(compressor, lambdas);
						}
						lambdas.add(this);
					}
					return Array.isArray(this.body) &&
						this.body.some(
							(/** @type {Node} */ statement) =>
								statement instanceof A.AST_DefClass
						)
						? withOptionsOff(compressor, ["if_return"], () =>
								original.call(this, compressor)
							)
						: original.call(this, compressor);
				}
		);
	}

	// terser trims an unused trailing parameter with its default, whose effects
	// a call passing no argument still runs; put such a parameter back.
	const dropUnused = A.AST_Scope.prototype.drop_unused;
	A.AST_Scope.prototype.drop_unused = function drop_unused(
		/** @type {Compressor} */ compressor
	) {
		const lambdas = corrections.enabled
			? defaultsWithEffects.get(compressor)
			: undefined;
		if (lambdas === undefined) return dropUnused.call(this, compressor);
		/** @type {[Node, Node[]][]} */
		const before = [];
		for (const lambda of lambdas) before.push([lambda, [...lambda.argnames]]);
		const result = dropUnused.call(this, compressor);
		for (const [lambda, argnames] of before) {
			let keep = lambda.argnames.length;
			for (let i = keep; i < argnames.length; i++) {
				if (hasDefaultWithEffects(argnames[i], compressor)) keep = i + 1;
			}
			for (let i = lambda.argnames.length; i < keep; i++) {
				lambda.argnames.push(argnames[i]);
			}
		}
		return result;
	};
};

module.exports = { correctFits, installCorrect };
