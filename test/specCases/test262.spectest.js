"use strict";

require("../helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const url = require("url");
const vm = require("vm");
const webpack = require("../..");
const expectNoDeprecations = require("../helpers/expectNoDeprecations");

/** @import NormalModule from "../../lib/NormalModule" */

const needDebug = typeof process.env.DEBUG !== "undefined";

const outputFileSystem = needDebug
	? require("fs")
	: (() => {
			const { Volume, createFsFromVolume } = require("memfs");

			return createFsFromVolume(new Volume());
		})();

const test262Dir = path.resolve(__dirname, "../external/test262-cases/");
const test262HarnessDir = path.resolve(test262Dir, "./harness");
const strictModeLoader = path.resolve(
	__dirname,
	"../helpers/test262StrictModeLoader.js"
);

/* cspell:disable */
const knownV8EvalBugs = [
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-decl-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/func-decl-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/func-expr-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-decl-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/gen-func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-named-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/gen-func-expr-named-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-named-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-nameless-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/gen-func-expr-nameless-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/gen-func-expr-nameless-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/gen-meth-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/gen-meth-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/gen-meth-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/meth-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/meth-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/meth-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/async-gen-func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/async-gen-func-decl-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/async-gen-func-expr-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-var-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-lex-bind-declare-arguments.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-func-decl-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-fn-body-cntns-arguments-func-decl-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-no-pre-existing-arguments-bindings-are-present-declare-arguments.js",
	"eval-code/direct/async-gen-meth-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-meth-fn-body-cntns-arguments-var-bind-declare-arguments.js",
	"eval-code/direct/async-gen-named-func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments-and-assign.js",
	"eval-code/direct/async-gen-named-func-expr-no-pre-existing-arguments-bindings-are-present-declare-arguments.js"
];
/* cspell:enable */

// Host bugs, not webpack ones: running the unbundled test262 file in a plain
// `vm` context fails exactly the same way.
/* cspell:disable */
const knownHostEvalBugs = [
	// V8 runs `eval(...spread)` as an indirect eval, the spec makes it direct
	"expressions/call/eval-spread.js",
	// A `vm` contextified global gives a top-level `var` a configurable
	// property, and re-declaring one from eval keeps the old descriptor
	"eval-code/direct/var-env-func-init-global-update-configurable.js",
	"eval-code/direct/var-env-var-init-global-exstng.js",
	"eval-code/indirect/var-env-func-init-global-update-configurable.js",
	"eval-code/indirect/var-env-var-init-global-exstng.js",
	// and it lets `function NaN(){}` be declared, so the eval's declarations are
	// not abandoned and the `var` beside it reaches the global after all
	"eval-code/direct/non-definable-function-with-function.js",
	"eval-code/direct/non-definable-function-with-variable.js",
	"eval-code/indirect/non-definable-function-with-function.js",
	"eval-code/indirect/non-definable-function-with-variable.js"
];
/* cspell:enable */

// `import()` stringifies its argument, so these ask for a name nothing
// resolves ("[object Promise]", "object") and reject, as the spec requires.
const UNRESOLVED_SPECIFIER = /Cannot find module/;

// These abandon a rejected promise on purpose. jest blames the running test,
// so the count and reason are asserted and cleared below.
const expectedAbandonedRejections = new Map([
	[
		"statements/async-function/evaluation-body.js",
		{ count: 1, reason: /resolver/ }
	],
	[
		"expressions/optional-chaining/member-expression-async-identifier.js",
		{ count: 1, reason: /^undefined$/ }
	],
	[
		"expressions/dynamic-import/assignment-expression/unary-expr.js",
		{ count: 8, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-block-labeled-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-block-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-do-while-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-else-braceless-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-else-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-if-braceless-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-if-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-while-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-with-expression-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/nested-with-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	],
	[
		"expressions/dynamic-import/syntax/valid/top-level-nested-imports.js",
		{ count: 2, reason: UNRESOLVED_SPECIFIER }
	]
]);

/* cspell:disable */
// Fail identically unbundled in a plain `vm` on the pinned Node.js, so the
// divergence is the host's and not webpack's.
const knownHostBugs = [
	// Adding a private field to a non-extensible object must throw, which the
	// pinned Node.js does not do, so it fails the same way unbundled.
	"import/import-defer/evaluation-triggers/ignore-private-name-access.js",
	"destructuring/binding/keyed-destructuring-property-reference-target-evaluation-order-with-bindings.js",
	"expressions/assignment/S11.13.1_A5_T1.js",
	"expressions/assignment/S11.13.1_A5_T2.js",
	"expressions/assignment/S11.13.1_A5_T3.js",
	"expressions/assignment/S11.13.1_A6_T1.js",
	"expressions/assignment/S11.13.1_A6_T2.js",
	"expressions/assignment/S11.13.1_A6_T3.js",
	"expressions/delete/11.4.1-4.a-8-s.js",
	"statements/class/elements/private-class-field-on-nonextensible-objects.js",
	"statements/class/subclass/private-class-field-on-nonextensible-return-override.js",
	"statements/variable/binding-resolution.js",
	"statements/with/get-binding-value-call-with-proxy-env.js",
	"statements/with/get-mutable-binding-binding-deleted-in-get-unscopables-strict-mode.js",
	"statements/with/get-binding-value-idref-with-proxy-env.js",
	"statements/with/set-mutable-binding-binding-deleted-in-get-unscopables-strict-mode.js",
	"statements/with/set-mutable-binding-binding-deleted-with-typed-array-in-proto-chain-strict-mode.js",
	"statements/with/set-mutable-binding-idref-compound-assign-with-proxy-env.js",
	"statements/with/set-mutable-binding-idref-with-proxy-env.js",
	"statements/with/unscopables-inc-dec.js",
	// `super[x]` must read the this binding before evaluating `x`, so the
	// `super()` in the index of a `delete` must not run. V8 evaluates it.
	"expressions/delete/super-property-uninitialized-this.js",
	// A `vm` contextified global refuses `Object.preventExtensions`.
	"global-code/script-decl-lex.js",
	// The store to an unresolvable name must throw before its right side
	// creates that name. V8 resolves it afterwards and finds it.
	"identifier-resolution/assign-to-global-undefined.js"
];
/* cspell:enable */

const knownV8WithBugs = [
	"expressions/compound-assignment/S11.13.2_A5.10_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.10_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.10_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.11_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.11_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.11_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.1_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.1_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.1_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.2_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.2_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.2_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.3_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.3_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.3_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.4_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.4_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.4_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.5_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.5_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.5_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.6_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.6_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.6_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.7_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.7_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.7_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.8_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.8_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.8_T3.js",
	"expressions/compound-assignment/S11.13.2_A5.9_T1.js",
	"expressions/compound-assignment/S11.13.2_A5.9_T2.js",
	"expressions/compound-assignment/S11.13.2_A5.9_T3.js",
	"expressions/compound-assignment/S11.13.2_A6.10_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.11_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.1_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.2_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.3_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.4_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.5_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.6_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.7_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.8_T1.js",
	"expressions/compound-assignment/S11.13.2_A6.9_T1.js",
	"expressions/compound-assignment/S11.13.2_A7.10_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.10_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.11_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.11_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.1_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.2_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.3_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.4_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.5_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.6_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.7_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.8_T4.js",
	"expressions/compound-assignment/S11.13.2_A7.9_T4.js",

	/* cspell:disable */
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--19.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--21.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--3.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--5.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--7.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--9.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--1.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--11.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--13.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--15.js",
	"expressions/compound-assignment/compound-assignment-operator-calls-putvalue-lref--v--17.js"
	/* cspell:enable */
];

const knownV8PrefixAndPostfixBugs = [
	// Optimizations bugs with `--` and `++`
	"expressions/prefix-decrement/S11.4.5_A6_T3.js",
	"expressions/prefix-decrement/S11.4.5_A6_T3.js",
	"expressions/prefix-decrement/S11.4.5_A5_T3.js",
	"expressions/prefix-decrement/S11.4.5_A5_T2.js",
	"expressions/prefix-decrement/S11.4.5_A5_T1.js",
	"expressions/prefix-increment/S11.4.4_A6_T3.js",
	"expressions/prefix-increment/S11.4.4_A6_T3.js",
	"expressions/prefix-increment/S11.4.4_A5_T3.js",
	"expressions/prefix-increment/S11.4.4_A5_T2.js",
	"expressions/prefix-increment/S11.4.4_A5_T1.js",
	"expressions/postfix-decrement/S11.3.2_A6_T3.js",
	"expressions/postfix-decrement/S11.3.2_A5_T3.js",
	"expressions/postfix-decrement/S11.3.2_A5_T2.js",
	"expressions/postfix-decrement/S11.3.2_A5_T1.js",
	"expressions/postfix-increment/S11.3.1_A6_T3.js",
	"expressions/postfix-increment/S11.3.1_A5_T3.js",
	"expressions/postfix-increment/S11.3.1_A5_T2.js",
	"expressions/postfix-increment/S11.3.1_A5_T1.js"
];

const knownV8Bugs = [
	...knownV8EvalBugs,
	...knownHostEvalBugs,
	...knownV8WithBugs,
	...knownHostBugs,
	...knownV8PrefixAndPostfixBugs,
	"module-code/namespace/internals/super-access-to-tdz-binding.js"
];

const compile = async (entry, scenario, options = {}) =>
	new Promise((resolve, reject) => {
		const { exportsPresence, ...webpackOptions } = options;
		const compiler = webpack({
			...webpackOptions,
			entry,
			context: path.dirname(entry),
			output: {
				// A Cyclic Module Record keeps its [[EvaluationError]] forever. Off
				// by default for CommonJS's sake, so the suite opts in.
				strictModuleErrorHandling: true,
				...webpackOptions.output,
				...(scenario === "module" ? { module: true } : { iife: false })
			},
			mode: options.mode || "development",
			target: "node",
			devtool: false,
			stats: "errors-warnings",
			performance: false,
			experiments: {
				deferImport: true
			},
			optimization: {
				emitOnErrors: true,
				minimize: false
			},
			cache: false,
			module: {
				parser: {
					javascript: {
						// For dynamic import test cases
						exprContextRegExp: /.*_FIXTURE\.js$/,
						exprContextRequest: path.dirname(entry),
						exprContextCritical: false,
						// The suite asserts spec namespace semantics, which cost runtime
						// code a normal build should not pay for.
						specNamespaceObject: true,
						// A Script's top-level `this` is the realm's global object, not
						// the exports object a CommonJS module gets.
						topLevelThis: "global",
						// For testing purposes, where the `export` is tested that it is not defined
						exportsPresence: exportsPresence || false,
						reexportExportsPresence: exportsPresence || false
					}
				},
				rules:
					// For top level await, maybe we can improve our parser to detect and switch to module
					scenario === "module"
						? [
								{
									// Avoid override `type` when we have `bytes` or `text` type
									with: {
										type: (value) => value !== "bytes" && value !== "text"
									},
									test: /\.js$/,
									type: "javascript/esm"
								}
							]
						: [
								// A file without the `module` flag is a Script, and only the
								// Script goal rejects what is legal in a Module.
								{
									test: (resource) => resource === entry,
									type: "javascript/dynamic"
								},
								// Whatever the entry reaches through `import()` is a Module,
								// whichever goal the entry itself was parsed under.
								{
									// Avoid override `type` when we have `bytes` or `text` type
									with: {
										type: (value) => value !== "bytes" && value !== "text"
									},
									test: /\.js$/,
									exclude: (resource) => resource === entry,
									type: "javascript/esm"
								},
								// The "strict" directive has to reach the parser, not only the
								// bundle: a sloppy parse accepts what only strict mode rejects.
								...(scenario === "strict"
									? [
											{
												test: (resource) => resource === entry,
												use: strictModeLoader
											}
										]
									: [])
							]
			},
			externals: [
				({ context, request }, callback) => {
					// Ignore empty string in dynamic `import`
					if (request === "") {
						return callback(null, "undefined");
					}
					callback();
				}
			]
		});

		compiler.outputFileSystem = outputFileSystem;
		compiler.run((err, stats) => {
			if (err) {
				reject(err);
				return;
			}

			compiler.close((err) => {
				if (err) {
					reject(err);
					return;
				}

				resolve(stats);
			});
		});
	});

const extractYamlArray = (meta, key) => {
	const regex = new RegExp(`${key}:\\s*\\[?([^\\]\\n]+)\\]?`);
	const match = meta.match(regex);
	if (!match) return [];

	return match[1]
		.split(",")
		.map((s) => s.trim().replace(/['"]/g, ""))
		.filter(Boolean);
};

const getTest262Meta = (content) => {
	const metaMatch = content.match(/\/\*---([\s\S]*?)---\*\//);
	if (!metaMatch) {
		return { flags: [], features: [], includes: [], negative: null };
	}

	const meta = metaMatch[1];

	const features = extractYamlArray(meta, "features");
	const flags = extractYamlArray(meta, "flags");

	const includes = extractYamlArray(meta, "includes");

	const negativeMatch = meta.match(
		/negative:[\s\S]*?phase:\s*(\w+)[\s\S]*?type:\s*(\w+)/
	);
	const negative = negativeMatch
		? { phase: negativeMatch[1], type: negativeMatch[2] }
		: null;

	return { features, flags, includes, negative };
};

const createRequire = (currentDir, context) =>
	function require(modulePath) {
		const resolvedPath = path.resolve(
			currentDir,
			modulePath.endsWith(".js") ? modulePath : `${modulePath}.js`
		);

		const code = outputFileSystem.readFileSync(resolvedPath, "utf8");

		const module = { exports: {} };
		const exports = module.exports;

		const wrapper = vm.runInNewContext(
			`(function(exports, require, module, __filename, __dirname) { ${code} \n})`,
			context
		);

		wrapper(
			exports,
			createRequire(path.dirname(resolvedPath)),
			module,
			resolvedPath,
			path.dirname(resolvedPath)
		);

		return module.exports;
	};

const create262Host = (context) => ({
	evalScript(code, options = {}) {
		return vm.runInContext(code, context, options);
	},
	createRealm() {
		const newSandbox = vm.runInNewContext("this");
		const newContext = vm.createContext(newSandbox);
		const newHost = create262Host(newContext);

		newHost.global = newContext;

		return newHost;
	}
});

const createImportModuleDynamically =
	(context, testFile, moduleCache) => async (specifier, referencing) => {
		const identifier = referencing.identifier
			? path.resolve(path.dirname(referencing.identifier), specifier)
			: path.resolve(path.dirname(testFile), specifier);

		if (moduleCache.has(identifier)) {
			return moduleCache.get(identifier);
		}

		const code = await outputFileSystem.promises.readFile(identifier, "utf8");
		const module = new vm.SourceTextModule(code, {
			context,
			identifier,
			importModuleDynamically: createImportModuleDynamically(
				context,
				testFile,
				moduleCache
			)
		});

		moduleCache.set(identifier, module);

		await module.link(
			createImportModuleDynamically(context, testFile, moduleCache)
		);
		// Evaluate here so `import()` resolves to a fully evaluated module (the
		// Node.js contract for `importModuleDynamically`); otherwise a top-level
		// `await import(...)` never settles.
		await module.evaluate();

		return module;
	};

const runModule = async (context, code, identifier, testFile, moduleCache) => {
	const module = new vm.SourceTextModule(code, {
		context,
		identifier,
		importModuleDynamically: createImportModuleDynamically(
			context,
			testFile,
			moduleCache
		),
		initializeImportMeta: (meta) => {
			meta.url = url.pathToFileURL(identifier).toString();
		}
	});

	await module.link(async () => {});
	await module.evaluate();

	return module;
};

const runScript = async (
	context,
	code,
	identifier,
	testFile,
	moduleCache,
	options = {}
) => {
	const script = new vm.Script(code, {
		filename: identifier,
		lineOffset: options.lineOffset || 0,
		columnOffset: options.columnOffset || 0,
		importModuleDynamically: createImportModuleDynamically(
			context,
			testFile,
			moduleCache
		)
	});

	script.runInContext(context, {
		displayErrors: true
	});

	await new Promise((resolve) => {
		setImmediate(resolve);
	});
};

const baseDir = path.posix.resolve(test262Dir, "./test/language/");

/* cspell:disable */
// The spec rejects `import()` for these link errors; webpack, like rollup,
// esbuild and bun, resolves linking at build time and reports them there.
const linkErrorsAtBuildTime = new Set([
	// A module that fails to resolve is a build error, deferred or not.
	"import/import-defer/errors/resolution-error/import-defer-of-missing-module-fails.js",
	// Assigning to a namespace import is a build error, earlier than the
	// spec's runtime TypeError.
	"module-code/instn-star-binding.js",
	// ambiguous star re-export
	"expressions/dynamic-import/catch/nested-arrow-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-arrow-function-return-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-function-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-function-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-function-return-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-gen-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-async-gen-return-await-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-block-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-block-labeled-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-do-while-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-else-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-function-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-if-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/nested-while-import-catch-instn-iee-err-ambiguous-import.js",
	"expressions/dynamic-import/catch/top-level-import-catch-instn-iee-err-ambiguous-import.js",

	// circular re-export chain
	"expressions/dynamic-import/catch/nested-arrow-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-arrow-function-return-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-function-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-function-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-function-return-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-gen-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-async-gen-return-await-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-block-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-block-labeled-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-do-while-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-else-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-function-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-if-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/nested-while-import-catch-instn-iee-err-circular.js",
	"expressions/dynamic-import/catch/top-level-import-catch-instn-iee-err-circular.js"
]);

const knownBugs = [
	// Tests use `$262.evalScript`/`Object.preventExtensions(this)` to declare
	// or collide global bindings; webpack wraps each module so `this` is not
	// the realm's global object and there is no Script Record context.
	"global-code/decl-func.js",
	"global-code/script-decl-func-err-non-configurable.js",
	"global-code/script-decl-func-err-non-extensible.js",
	"global-code/script-decl-func.js",
	"global-code/script-decl-var-collision.js",
	"global-code/script-decl-var-err.js",
	"global-code/script-decl-var.js",

	// `Object.defineProperty(this, "x", { get })` on the global object — the test
	// relies on the getter's side effect being visible to a bare `x--`. webpack wraps
	// modules, so `this` is not the global and bare identifiers are wrapper-scoped.
	"expressions/postfix-decrement/operator-x-postfix-decrement-calls-putvalue-lhs-newvalue--1.js",
	"expressions/postfix-increment/operator-x-postfix-increment-calls-putvalue-lhs-newvalue--1.js",

	// The file imports itself, so the entry script and the module it loads are
	// one bundled module, evaluated once where the spec evaluates it twice.
	"expressions/dynamic-import/eval-self-once-script.js",
	// The specifier is written inside an `eval`, so this import never reaches
	// the module graph.
	"expressions/dynamic-import/usage-from-eval.js",
	// The spec builds it from the intrinsic %Promise%; our chunk loading reads the
	// global binding, which this test replaces before importing.
	"expressions/dynamic-import/returns-promise.js",
	// The spec aggregates evaluation promises with SafePerformPromiseAll, which
	// never reads `then`; our runtime uses `Promise.all` and `.then` and is seen.
	"expressions/dynamic-import/import-defer/import-defer-transitive-async-module/promise-prototype-then-not-called.js",

	// Same root cause as the postfix variants above: getter on a global `this`
	// property must run before the increment writes back, but webpack scopes
	// bare `x` to its module wrapper rather than the realm global.
	"expressions/prefix-increment/operator-prefix-increment-x-calls-putvalue-lhs-newvalue--1.js",
	"expressions/prefix-decrement/operator-prefix-decrement-x-calls-putvalue-lhs-newvalue--1.js"
];

// Tree shaking drops unused code whose evaluation the spec makes observable, so
// these diverge in production alone. Used, both match the spec, as does development.
const deliberateProductionDivergences = [
	// The inner graph reads an unused class heritage and an unused export's value
	// as pure, which `configCases/inner-graph/issue-17565` pins.
	"statements/class/definition/prototype-getter.js",
	"module-code/eval-export-dflt-expr-err-get-value.js"
];
/* cspell:enable */

const testFiles = fs
	.globSync(`${baseDir}/**/*.js`)
	.filter((name) => !/_FIXTURE\.js$/i.test(name));

const shard =
	typeof process.env.SHARD !== "undefined"
		? process.env.SHARD.split("/").map((item) => Number.parseInt(item, 10))
		: [1, 1];

if (
	typeof shard[0] === "undefined" ||
	typeof shard[1] === "undefined" ||
	shard[0] > shard[1] ||
	shard[0] <= 0 ||
	shard[1] <= 0
) {
	throw new Error(
		`Invalid \`SHARD\` value - it should be less then a part and more than zero, shard part is ${shard[0]}, count of shards is ${shard[1]}`
	);
}

/**
 * @template T
 * @param {T[]} array an array
 * @param {number} n number of chunks
 * @returns {T[][]} splitted to n chunks
 */
function splitToNChunks(array, n) {
	/** @type {T[][]} */
	const result = [];

	for (let i = n; i > 0; i--) {
		result.push(
			/** @type {T[]} */
			(array.splice(0, Math.ceil(array.length / i)))
		);
	}

	return result;
}

const shardedTestFiles = splitToNChunks([...testFiles], shard[1])[shard[0] - 1];

expectNoDeprecations();

describe("test262", () => {
	for (const mode of ["development", "production"]) {
		describe(mode, () => {
			for (const testFile of shardedTestFiles) {
				const name = path.posix.relative(baseDir, testFile);
				const outputPath = path.resolve(
					__dirname,
					"../js/test262-cases",
					mode,
					path.join(path.dirname(name), path.basename(name, path.extname(name)))
				);
				const outputFile = path.resolve(outputPath, "./main.js");
				const content = fs.readFileSync(testFile, "utf8");
				const meta = getTest262Meta(content);

				if (
					meta.negative &&
					!["parse", "runtime", "resolution"].includes(meta.negative.phase)
				) {
					throw new Error(
						`Error in test file "${outputFile}" ("${testFile}"), unknown "${meta.negative.phase}" negative phase`
					);
				}

				if (
					// Decorators are not supported
					meta.features.includes("decorators") ||
					// TODO Not implemented. A negative parse test still runs: the
					// syntax it rejects is rejected either way.
					((meta.features.includes("source-phase-imports") ||
						meta.features.includes("source-phase-imports-module-source")) &&
						!(meta.negative && meta.negative.phase === "parse")) ||
					knownBugs.includes(name) ||
					(mode === "production" &&
						deliberateProductionDivergences.includes(name))
				) {
					// eslint-disable-next-line jest/no-disabled-tests
					it.skip(name, () => {});

					continue;
				}

				let scenarios;

				if (meta.flags.includes("module")) {
					scenarios = ["module"];
				} else if (meta.flags.includes("raw")) {
					scenarios = ["sloppy"];
				} else if (meta.flags.includes("onlyStrict")) {
					scenarios = ["strict"];
				} else if (meta.flags.includes("noStrict")) {
					scenarios = ["sloppy"];
				} else {
					scenarios = ["sloppy", "strict"];
				}

				for (const scenario of scenarios) {
					it(`${name} ("${scenario}")`, async () => {
						if (needDebug) {
							process.stdout.write(`Running ${name} ("${scenario}")\n`);
						}

						// A link error is a build error for webpack, not a throw, so the
						// presence checks the other tests disable must be on.
						const isLinkErrorTest =
							(meta.negative && meta.negative.phase === "resolution") ||
							linkErrorsAtBuildTime.has(name);

						const stats = await compile(testFile, scenario, {
							mode,
							...(isLinkErrorTest ? { exportsPresence: "error" } : {}),
							output: {
								path: outputPath,
								filename: path.relative(outputPath, outputFile)
							}
						});

						if (isLinkErrorTest) {
							// The bundle must not run: linking failed, so the body these
							// tests guard against evaluation was never reached.
							if (stats.compilation.errors.length === 0) {
								throw new Error(
									`Error in test file "${outputFile}" ("${testFile}"), expected a link error`
								);
							}

							return;
						}

						const includes = meta.flags.includes("raw")
							? []
							: [
									"sta.js",
									"assert.js",
									// We override `$MAX_ITERATIONS` above
									...meta.includes.filter((item) => item !== "tcoHelper.js")
								];
						const includesCode = await Promise.all(
							includes.map((include) =>
								fs.promises.readFile(
									path.resolve(test262HarnessDir, include),
									"utf8"
								)
							)
						);

						const bundledCode = await outputFileSystem.promises.readFile(
							outputFile,
							"utf8"
						);
						const codeBefore = [
							scenario === "strict" ? "'use strict';" : "",
							...includesCode
						].join("\n");
						const code = [codeBefore, bundledCode].join("\n");

						const isAsync = meta.flags.includes("async");

						const moduleCache = new Map();
						const sandbox = Object.create(null);

						sandbox.$MAX_ITERATIONS = 1;

						let resolve;
						let reject;
						let asyncPromise;

						if (isAsync) {
							asyncPromise = new Promise((res, rej) => {
								resolve = res;
								reject = rej;
							});

							sandbox.$DONE = (err) => {
								if (err) reject(err);
								else resolve();
							};
						}

						const context = vm.createContext(
							sandbox,
							// `afterEvaluate` drains microtasks only at evaluate boundaries, which in the
							// module scenario deadlocks a top-level `await import(...)` — its resolution needs
							// a microtask checkpoint while `evaluate()` is still running.
							scenario === "module" ? {} : { microtaskMode: "afterEvaluate" }
						);

						sandbox.globalThis = sandbox;
						sandbox.Buffer = Buffer;
						sandbox.$262 = create262Host(context);
						// For debug
						sandbox.console = console;

						if (scenario !== "module") {
							sandbox.require = createRequire(outputPath, context);
						}

						let errored = false;

						try {
							if (scenario === "module") {
								await runModule(
									context,
									code,
									outputFile,
									testFile,
									moduleCache
								);
							} else {
								await runScript(
									context,
									code,
									outputFile,
									testFile,
									moduleCache,
									{
										lineOffset: -codeBefore.split("\n").length
									}
								);
							}

							if (isAsync) {
								await asyncPromise;
							}

							if (meta.negative) {
								throw new Error(
									`Error in test file "${outputFile}" ("${testFile}"), expected ${
										meta.negative.phase === "parse"
											? "parse"
											: meta.negative.phase === "runtime"
												? "runtime"
												: ""
									} error`
								);
							}
						} catch (err) {
							errored = err;
						}

						const abandoned = expectedAbandonedRejections.get(name);
						if (abandoned !== undefined) {
							// The rejection settles a microtask after the body that
							// abandoned it, so drain before reading jest's tally.
							await new Promise((resolve) => {
								setImmediate(resolve);
							});
							const runningTest =
								globalThis.JEST_STATE_SYMBOL &&
								globalThis.JEST_STATE_SYMBOL.currentlyRunningTest;
							const byPromise =
								runningTest && runningTest.unhandledRejectionErrorByPromise;
							const reasons = byPromise
								? [...byPromise.values()].map((reason) =>
										String(reason && reason.message ? reason.message : reason)
									)
								: [];
							if (byPromise) byPromise.clear();
							if (
								reasons.length !== abandoned.count ||
								reasons.some((reason) => !abandoned.reason.test(reason))
							) {
								throw new Error(
									`Error in test file "${outputFile}" ("${testFile}"), expected ${
										abandoned.count
									} abandoned rejection(s) matching ${
										abandoned.reason
									} but got ${reasons.length}: ${JSON.stringify(reasons)}`
								);
							}
						}

						if (errored && knownV8Bugs.includes(name)) {
							return;
						}

						const { warnings, errors } = stats.compilation;

						const isExpectedParseError =
							errored &&
							meta.negative &&
							meta.negative.phase === "parse" &&
							// meta.negative.type === errored.constructor.name &&
							errors.every((item) => item.name === "ModuleParseError");

						const isExpectedRuntimeError =
							errored &&
							meta.negative &&
							meta.negative.phase === "runtime" &&
							errored.constructor.name === meta.negative.type;

						if (errored && !isExpectedParseError && !isExpectedRuntimeError) {
							throw new Error(
								`Error in test file "${outputFile}" ("${testFile}")`,
								{
									cause: errored instanceof Error ? errored : new Error(errored)
								}
							);
						}

						// The `_FIXTURE` context dependency bundles every fixture beside
						// the test, so a circular reexport in one warns on tests that
						// never import it.
						const unexpectedWarnings = warnings.filter(
							(item) =>
								!/is part of a circular reexport chain in '\.\/[^']*_FIXTURE\.js'/.test(
									item.message
								)
						);

						if (
							unexpectedWarnings.length > 0 &&
							// Just syntax test
							name !==
								"module-code/top-level-await/syntax/await-expr-dyn-import.js"
						) {
							throw new Error(
								`Warnings in test file "${outputFile}" ("${testFile}")`,
								{
									cause: new Error(
										`Errors:\n\n${unexpectedWarnings.join("\n")}`
									)
								}
							);
						}

						const hasUnexpectedErrors = errors.some(
							(item) =>
								!/Can't resolve '\.\/THIS_FILE_DOES_NOT_EXIST\.js'/.test(
									item
								) &&
								// `script-code_FIXTURE.js` only parses as a script; webpack
								// reports the `SyntaxError` the test expects at build time
								!(
									item.name === "ModuleParseError" &&
									item.module &&
									/script-code_FIXTURE\.js$/.test(
										/** @type {NormalModule} */ (item.module).resource
									)
								)
						);

						if (!isExpectedParseError && hasUnexpectedErrors) {
							throw new Error(
								`Errors in test file "${outputFile}" ("${testFile}")`,
								{
									cause: new Error(`Errors:\n\n${errors.join("\n")}`)
								}
							);
						}

						if (needDebug) {
							process.stdout.write(`Finished ${name} ("${scenario}")\n`);
						}
					});
				}
			}
		});
	}
});
