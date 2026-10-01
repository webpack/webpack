"use strict";

require("../helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const url = require("url");
const vm = require("vm");
const MinimizerPlugin = require("minimizer-webpack-plugin");
const webpack = require("../..");
const jsMinify = require("../../lib/javascript/jsMinify");
const expectNoDeprecations = require("../helpers/expectNoDeprecations");

/** @import NormalModule from "../../lib/module/NormalModule" */

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

// The options production minifies with.
const MINIFY = { compress: { passes: 2 } };

// A minifier renames bindings, so a function naming itself after one reads the
// new name: test262 files these SetFunctionName cases as `fn-name`.
const renamedByMinifier = /(?:^|[/-])fn-name(?:[-.]|$)/;

// test262 cases the minified mode fails, by `name (scenario)`, grouped by why.
// Each still runs and must fail; one passing fails the suite until removed, so
// these are what webpack's `correct` phase has left to fix.
/* cspell:disable */
/** @type {{ reason: string, tests: string[] }[]} */
const MINIFIED_FAILURES = [
	{
		reason: "terser drops an evaluation that throws",
		tests: [
			"arguments-object/10.6-13-c-1-s.js (strict)",
			"computed-property-names/class/static/generator-prototype.js (sloppy)",
			"computed-property-names/class/static/generator-prototype.js (strict)",
			"computed-property-names/class/static/getter-prototype.js (sloppy)",
			"computed-property-names/class/static/getter-prototype.js (strict)",
			"computed-property-names/class/static/method-prototype.js (sloppy)",
			"computed-property-names/class/static/method-prototype.js (strict)",
			"computed-property-names/class/static/setter-prototype.js (sloppy)",
			"computed-property-names/class/static/setter-prototype.js (strict)",
			"directive-prologue/get-accsr-inside-func-expr-runtime.js (sloppy)",
			"directive-prologue/get-accsr-runtime.js (sloppy)",
			"expressions/addition/bigint-and-number.js (sloppy)",
			"expressions/addition/bigint-and-number.js (strict)",
			"expressions/addition/bigint-errors.js (sloppy)",
			"expressions/addition/bigint-errors.js (strict)",
			"expressions/addition/bigint-toprimitive.js (sloppy)",
			"expressions/addition/bigint-toprimitive.js (strict)",
			"expressions/addition/coerce-symbol-to-prim-err.js (sloppy)",
			"expressions/addition/coerce-symbol-to-prim-err.js (strict)",
			"expressions/addition/coerce-symbol-to-prim-return-obj.js (sloppy)",
			"expressions/addition/coerce-symbol-to-prim-return-obj.js (strict)",
			"expressions/addition/coerce-symbol-to-prim-return-prim.js (sloppy)",
			"expressions/addition/coerce-symbol-to-prim-return-prim.js (strict)",
			"expressions/addition/get-symbol-to-prim-err.js (sloppy)",
			"expressions/addition/get-symbol-to-prim-err.js (strict)",
			"expressions/addition/symbol-to-string.js (sloppy)",
			"expressions/addition/symbol-to-string.js (strict)",
			"expressions/array/spread-err-mult-err-expr-throws.js (sloppy)",
			"expressions/array/spread-err-mult-err-expr-throws.js (strict)",
			"expressions/array/spread-err-mult-err-iter-get-value.js (sloppy)",
			"expressions/array/spread-err-mult-err-iter-get-value.js (strict)",
			"expressions/array/spread-err-mult-err-itr-get-call.js (sloppy)",
			"expressions/array/spread-err-mult-err-itr-get-call.js (strict)",
			"expressions/array/spread-err-mult-err-itr-get-get.js (sloppy)",
			"expressions/array/spread-err-mult-err-itr-get-get.js (strict)",
			"expressions/array/spread-err-mult-err-itr-step.js (sloppy)",
			"expressions/array/spread-err-mult-err-itr-step.js (strict)",
			"expressions/array/spread-err-mult-err-itr-value.js (sloppy)",
			"expressions/array/spread-err-mult-err-itr-value.js (strict)",
			"expressions/array/spread-err-sngl-err-expr-throws.js (sloppy)",
			"expressions/array/spread-err-sngl-err-expr-throws.js (strict)",
			"expressions/array/spread-err-sngl-err-itr-get-call.js (sloppy)",
			"expressions/array/spread-err-sngl-err-itr-get-call.js (strict)",
			"expressions/array/spread-err-sngl-err-itr-get-get.js (sloppy)",
			"expressions/array/spread-err-sngl-err-itr-get-get.js (strict)",
			"expressions/array/spread-err-sngl-err-itr-get-value.js (sloppy)",
			"expressions/array/spread-err-sngl-err-itr-get-value.js (strict)",
			"expressions/array/spread-err-sngl-err-itr-step.js (sloppy)",
			"expressions/array/spread-err-sngl-err-itr-step.js (strict)",
			"expressions/array/spread-err-sngl-err-itr-value.js (sloppy)",
			"expressions/array/spread-err-sngl-err-itr-value.js (strict)",
			"expressions/assignment/dstr/array-elem-init-let.js (sloppy)",
			"expressions/assignment/dstr/array-elem-init-let.js (strict)",
			"expressions/assignment/dstr/array-elem-put-let.js (sloppy)",
			"expressions/assignment/dstr/array-elem-put-let.js (strict)",
			"expressions/assignment/dstr/array-rest-put-let.js (sloppy)",
			"expressions/assignment/dstr/array-rest-put-let.js (strict)",
			"expressions/assignment/dstr/obj-id-init-let.js (sloppy)",
			"expressions/assignment/dstr/obj-id-init-let.js (strict)",
			"expressions/assignment/dstr/obj-id-put-let.js (sloppy)",
			"expressions/assignment/dstr/obj-id-put-let.js (strict)",
			"expressions/assignment/dstr/obj-prop-elem-init-let.js (sloppy)",
			"expressions/assignment/dstr/obj-prop-elem-init-let.js (strict)",
			"expressions/assignment/dstr/obj-prop-put-let.js (sloppy)",
			"expressions/assignment/dstr/obj-prop-put-let.js (strict)",
			"expressions/async-arrow-function/async-lineterminator-identifier-throws.js (sloppy)",
			"expressions/async-arrow-function/async-lineterminator-identifier-throws.js (strict)",
			"expressions/async-arrow-function/escaped-async-line-terminator.js (sloppy)",
			"expressions/async-arrow-function/escaped-async-line-terminator.js (strict)",
			"expressions/bitwise-and/bigint-and-number.js (sloppy)",
			"expressions/bitwise-and/bigint-and-number.js (strict)",
			"expressions/bitwise-and/bigint-errors.js (sloppy)",
			"expressions/bitwise-and/bigint-errors.js (strict)",
			"expressions/bitwise-and/bigint-toprimitive.js (sloppy)",
			"expressions/bitwise-and/bigint-toprimitive.js (strict)",
			"expressions/bitwise-or/bigint-and-number.js (sloppy)",
			"expressions/bitwise-or/bigint-and-number.js (strict)",
			"expressions/bitwise-or/bigint-errors.js (sloppy)",
			"expressions/bitwise-or/bigint-errors.js (strict)",
			"expressions/bitwise-or/bigint-toprimitive.js (sloppy)",
			"expressions/bitwise-or/bigint-toprimitive.js (strict)",
			"expressions/bitwise-xor/bigint-and-number.js (sloppy)",
			"expressions/bitwise-xor/bigint-and-number.js (strict)",
			"expressions/bitwise-xor/bigint-errors.js (sloppy)",
			"expressions/bitwise-xor/bigint-errors.js (strict)",
			"expressions/bitwise-xor/bigint-toprimitive.js (sloppy)",
			"expressions/bitwise-xor/bigint-toprimitive.js (strict)",
			"expressions/class/accessor-name-inst/computed-err-to-prop-key.js (sloppy)",
			"expressions/class/accessor-name-inst/computed-err-to-prop-key.js (strict)",
			"expressions/class/accessor-name-static/computed-err-to-prop-key.js (sloppy)",
			"expressions/class/accessor-name-static/computed-err-to-prop-key.js (strict)",
			"expressions/class/elements/evaluation-error/computed-name-toprimitive-err.js (sloppy)",
			"expressions/class/elements/evaluation-error/computed-name-toprimitive-err.js (strict)",
			"expressions/class/elements/evaluation-error/computed-name-toprimitive-returns-noncallable.js (sloppy)",
			"expressions/class/elements/evaluation-error/computed-name-toprimitive-returns-noncallable.js (strict)",
			"expressions/class/elements/evaluation-error/computed-name-toprimitive-returns-nonobject.js (sloppy)",
			"expressions/class/elements/evaluation-error/computed-name-toprimitive-returns-nonobject.js (strict)",
			"expressions/class/elements/evaluation-error/computed-name-tostring-err.js (sloppy)",
			"expressions/class/elements/evaluation-error/computed-name-tostring-err.js (strict)",
			"expressions/class/elements/evaluation-error/computed-name-valueof-err.js (sloppy)",
			"expressions/class/elements/evaluation-error/computed-name-valueof-err.js (strict)",
			"expressions/class/elements/fields-computed-name-static-propname-prototype.js (sloppy)",
			"expressions/class/elements/fields-computed-name-static-propname-prototype.js (strict)",
			"expressions/class/heritage-arrow-function.js (sloppy)",
			"expressions/class/heritage-arrow-function.js (strict)",
			"expressions/class/heritage-async-arrow-function.js (sloppy)",
			"expressions/class/heritage-async-arrow-function.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.10_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.10_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.11_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.11_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.1_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.1_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.2_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.2_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.3_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.3_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.4_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.4_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.5_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.5_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.6_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.6_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.7_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.7_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.8_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.8_T3.js (strict)",
			"expressions/compound-assignment/S11.13.2_A7.9_T3.js (sloppy)",
			"expressions/compound-assignment/S11.13.2_A7.9_T3.js (strict)",
			"expressions/division/bigint-and-number.js (sloppy)",
			"expressions/division/bigint-and-number.js (strict)",
			"expressions/division/bigint-complex-infinity.js (sloppy)",
			"expressions/division/bigint-complex-infinity.js (strict)",
			"expressions/division/bigint-errors.js (sloppy)",
			"expressions/division/bigint-errors.js (strict)",
			"expressions/division/bigint-toprimitive.js (sloppy)",
			"expressions/division/bigint-toprimitive.js (strict)",
			"expressions/equals/coerce-symbol-to-prim-err.js (sloppy)",
			"expressions/equals/coerce-symbol-to-prim-err.js (strict)",
			"expressions/equals/coerce-symbol-to-prim-return-obj.js (sloppy)",
			"expressions/equals/coerce-symbol-to-prim-return-obj.js (strict)",
			"expressions/equals/get-symbol-to-prim-err.js (sloppy)",
			"expressions/equals/get-symbol-to-prim-err.js (strict)",
			"expressions/exponentiation/bigint-and-number.js (sloppy)",
			"expressions/exponentiation/bigint-and-number.js (strict)",
			"expressions/exponentiation/bigint-errors.js (sloppy)",
			"expressions/exponentiation/bigint-errors.js (strict)",
			"expressions/exponentiation/bigint-negative-exponent-throws.js (sloppy)",
			"expressions/exponentiation/bigint-negative-exponent-throws.js (strict)",
			"expressions/exponentiation/bigint-toprimitive.js (sloppy)",
			"expressions/exponentiation/bigint-toprimitive.js (strict)",
			"expressions/greater-than/S11.8.2_A2.3_T1.js (sloppy)",
			"expressions/greater-than/S11.8.2_A2.3_T1.js (strict)",
			"expressions/greater-than/bigint-and-symbol.js (sloppy)",
			"expressions/greater-than/bigint-and-symbol.js (strict)",
			"expressions/instanceof/primitive-prototype-with-object.js (sloppy)",
			"expressions/instanceof/primitive-prototype-with-object.js (strict)",
			"expressions/instanceof/prototype-getter-with-object-throws.js (sloppy)",
			"expressions/instanceof/prototype-getter-with-object-throws.js (strict)",
			"expressions/instanceof/symbol-hasinstance-get-err.js (sloppy)",
			"expressions/instanceof/symbol-hasinstance-get-err.js (strict)",
			"expressions/instanceof/symbol-hasinstance-not-callable.js (sloppy)",
			"expressions/instanceof/symbol-hasinstance-not-callable.js (strict)",
			"expressions/left-shift/bigint-and-number.js (sloppy)",
			"expressions/left-shift/bigint-and-number.js (strict)",
			"expressions/left-shift/bigint-errors.js (sloppy)",
			"expressions/left-shift/bigint-errors.js (strict)",
			"expressions/left-shift/bigint-toprimitive.js (sloppy)",
			"expressions/left-shift/bigint-toprimitive.js (strict)",
			"expressions/less-than-or-equal/S11.8.3_A2.3_T1.js (sloppy)",
			"expressions/less-than-or-equal/S11.8.3_A2.3_T1.js (strict)",
			"expressions/less-than/bigint-and-symbol.js (sloppy)",
			"expressions/less-than/bigint-and-symbol.js (strict)",
			"expressions/modulus/bigint-and-number.js (sloppy)",
			"expressions/modulus/bigint-and-number.js (strict)",
			"expressions/modulus/bigint-errors.js (sloppy)",
			"expressions/modulus/bigint-errors.js (strict)",
			"expressions/modulus/bigint-toprimitive.js (sloppy)",
			"expressions/modulus/bigint-toprimitive.js (strict)",
			"expressions/multiplication/bigint-and-number.js (sloppy)",
			"expressions/multiplication/bigint-and-number.js (strict)",
			"expressions/multiplication/bigint-errors.js (sloppy)",
			"expressions/multiplication/bigint-errors.js (strict)",
			"expressions/multiplication/bigint-toprimitive.js (sloppy)",
			"expressions/multiplication/bigint-toprimitive.js (strict)",
			"expressions/object/accessor-name-computed-err-to-prop-key.js (sloppy)",
			"expressions/object/accessor-name-computed-err-to-prop-key.js (strict)",
			"expressions/right-shift/bigint-and-number.js (sloppy)",
			"expressions/right-shift/bigint-and-number.js (strict)",
			"expressions/right-shift/bigint-errors.js (sloppy)",
			"expressions/right-shift/bigint-errors.js (strict)",
			"expressions/right-shift/bigint-toprimitive.js (sloppy)",
			"expressions/right-shift/bigint-toprimitive.js (strict)",
			"expressions/subtraction/bigint-and-number.js (sloppy)",
			"expressions/subtraction/bigint-and-number.js (strict)",
			"expressions/subtraction/bigint-errors.js (sloppy)",
			"expressions/subtraction/bigint-errors.js (strict)",
			"expressions/subtraction/bigint-toprimitive.js (sloppy)",
			"expressions/subtraction/bigint-toprimitive.js (strict)",
			"expressions/template-literal/literal-expr-tostr-error.js (sloppy)",
			"expressions/template-literal/literal-expr-tostr-error.js (strict)",
			"expressions/template-literal/middle-list-many-expr-tostr-error.js (sloppy)",
			"expressions/template-literal/middle-list-many-expr-tostr-error.js (strict)",
			"expressions/template-literal/middle-list-one-expr-tostr-error.js (sloppy)",
			"expressions/template-literal/middle-list-one-expr-tostr-error.js (strict)",
			"expressions/unsigned-right-shift/bigint-and-number.js (sloppy)",
			"expressions/unsigned-right-shift/bigint-and-number.js (strict)",
			"expressions/unsigned-right-shift/bigint-errors.js (sloppy)",
			"expressions/unsigned-right-shift/bigint-errors.js (strict)",
			"expressions/unsigned-right-shift/bigint-non-primitive.js (sloppy)",
			"expressions/unsigned-right-shift/bigint-non-primitive.js (strict)",
			"expressions/unsigned-right-shift/bigint-wrapped-values.js (sloppy)",
			"expressions/unsigned-right-shift/bigint-wrapped-values.js (strict)",
			"expressions/unsigned-right-shift/bigint.js (sloppy)",
			"expressions/unsigned-right-shift/bigint.js (strict)",
			"module-code/instn-iee-bndng-let.js (module)",
			"module-code/instn-local-bndng-cls.js (module)",
			"module-code/instn-local-bndng-const.js (module)",
			"module-code/instn-local-bndng-export-cls.js (module)",
			"module-code/instn-local-bndng-export-const.js (module)",
			"module-code/instn-local-bndng-export-let.js (module)",
			"module-code/instn-local-bndng-let.js (module)",
			"statements/async-function/syntax-declaration-no-line-terminator.js (sloppy)",
			"statements/async-function/syntax-declaration-no-line-terminator.js (strict)",
			"statements/await-using/block-local-closure-get-before-initialization.js (sloppy)",
			"statements/await-using/block-local-closure-get-before-initialization.js (strict)",
			"statements/await-using/block-local-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/await-using/block-local-use-before-initialization-in-prior-statement.js (strict)",
			"statements/await-using/function-local-closure-get-before-initialization.js (sloppy)",
			"statements/await-using/function-local-closure-get-before-initialization.js (strict)",
			"statements/await-using/function-local-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/await-using/function-local-use-before-initialization-in-prior-statement.js (strict)",
			"statements/await-using/global-closure-get-before-initialization.js (sloppy)",
			"statements/await-using/global-closure-get-before-initialization.js (strict)",
			"statements/await-using/global-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/await-using/global-use-before-initialization-in-prior-statement.js (strict)",
			"statements/class/accessor-name-inst/computed-err-to-prop-key.js (sloppy)",
			"statements/class/accessor-name-inst/computed-err-to-prop-key.js (strict)",
			"statements/class/accessor-name-static/computed-err-to-prop-key.js (sloppy)",
			"statements/class/accessor-name-static/computed-err-to-prop-key.js (strict)",
			"statements/class/definition/constructable-but-no-prototype.js (sloppy)",
			"statements/class/definition/constructable-but-no-prototype.js (strict)",
			"statements/class/definition/getters-non-configurable-err.js (sloppy)",
			"statements/class/definition/getters-non-configurable-err.js (strict)",
			"statements/class/definition/invalid-extends.js (sloppy)",
			"statements/class/definition/invalid-extends.js (strict)",
			"statements/class/definition/prototype-setter.js (sloppy)",
			"statements/class/definition/prototype-setter.js (strict)",
			"statements/class/definition/setters-non-configurable-err.js (sloppy)",
			"statements/class/definition/setters-non-configurable-err.js (strict)",
			"statements/class/elements/evaluation-error/computed-name-toprimitive-err.js (sloppy)",
			"statements/class/elements/evaluation-error/computed-name-toprimitive-err.js (strict)",
			"statements/class/elements/evaluation-error/computed-name-toprimitive-returns-noncallable.js (sloppy)",
			"statements/class/elements/evaluation-error/computed-name-toprimitive-returns-noncallable.js (strict)",
			"statements/class/elements/evaluation-error/computed-name-toprimitive-returns-nonobject.js (sloppy)",
			"statements/class/elements/evaluation-error/computed-name-toprimitive-returns-nonobject.js (strict)",
			"statements/class/elements/evaluation-error/computed-name-tostring-err.js (sloppy)",
			"statements/class/elements/evaluation-error/computed-name-tostring-err.js (strict)",
			"statements/class/elements/evaluation-error/computed-name-valueof-err.js (sloppy)",
			"statements/class/elements/evaluation-error/computed-name-valueof-err.js (strict)",
			"statements/class/elements/fields-computed-name-static-computed-var-propname-prototype.js (sloppy)",
			"statements/class/elements/fields-computed-name-static-computed-var-propname-prototype.js (strict)",
			"statements/class/elements/fields-computed-name-static-propname-prototype.js (sloppy)",
			"statements/class/elements/fields-computed-name-static-propname-prototype.js (strict)",
			"statements/class/name-binding/const.js (sloppy)",
			"statements/class/name-binding/const.js (strict)",
			"statements/class/name-binding/in-extends-expression-assigned.js (sloppy)",
			"statements/class/name-binding/in-extends-expression-assigned.js (strict)",
			"statements/class/name-binding/in-extends-expression-grouped.js (sloppy)",
			"statements/class/name-binding/in-extends-expression-grouped.js (strict)",
			"statements/class/name-binding/in-extends-expression.js (sloppy)",
			"statements/class/name-binding/in-extends-expression.js (strict)",
			"statements/class/static-method-gen-non-configurable-err.js (sloppy)",
			"statements/class/static-method-gen-non-configurable-err.js (strict)",
			"statements/class/static-method-non-configurable-err.js (sloppy)",
			"statements/class/static-method-non-configurable-err.js (strict)",
			"statements/class/strict-mode/arguments-callee.js (sloppy)",
			"statements/class/strict-mode/arguments-callee.js (strict)",
			"statements/class/subclass/builtin-objects/Proxy/no-prototype-throws.js (sloppy)",
			"statements/class/subclass/builtin-objects/Proxy/no-prototype-throws.js (strict)",
			"statements/class/subclass/class-definition-null-proto-this.js (sloppy)",
			"statements/class/subclass/class-definition-null-proto-this.js (strict)",
			"statements/class/subclass/superclass-arrow-function.js (sloppy)",
			"statements/class/subclass/superclass-arrow-function.js (strict)",
			"statements/class/subclass/superclass-async-function.js (sloppy)",
			"statements/class/subclass/superclass-async-function.js (strict)",
			"statements/class/subclass/superclass-async-generator-function.js (sloppy)",
			"statements/class/subclass/superclass-async-generator-function.js (strict)",
			"statements/class/subclass/superclass-generator-function.js (sloppy)",
			"statements/class/subclass/superclass-generator-function.js (strict)",
			"statements/const/block-local-closure-get-before-initialization.js (strict)",
			"statements/const/block-local-use-before-initialization-in-declaration-statement.js (sloppy)",
			"statements/const/block-local-use-before-initialization-in-declaration-statement.js (strict)",
			"statements/const/block-local-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/const/block-local-use-before-initialization-in-prior-statement.js (strict)",
			"statements/const/function-local-closure-get-before-initialization.js (sloppy)",
			"statements/const/function-local-closure-get-before-initialization.js (strict)",
			"statements/const/function-local-use-before-initialization-in-declaration-statement.js (sloppy)",
			"statements/const/function-local-use-before-initialization-in-declaration-statement.js (strict)",
			"statements/const/function-local-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/const/function-local-use-before-initialization-in-prior-statement.js (strict)",
			"statements/for-in/scope-body-lex-open.js (sloppy)",
			"statements/for-in/scope-body-lex-open.js (strict)",
			"statements/for-in/scope-head-lex-close.js (sloppy)",
			"statements/for-in/scope-head-lex-close.js (strict)",
			"statements/for-in/scope-head-lex-open.js (sloppy)",
			"statements/for-in/scope-head-lex-open.js (strict)",
			"statements/for-of/dstr/array-elem-init-let.js (sloppy)",
			"statements/for-of/dstr/array-elem-init-let.js (strict)",
			"statements/for-of/dstr/array-elem-put-let.js (sloppy)",
			"statements/for-of/dstr/array-elem-put-let.js (strict)",
			"statements/for-of/dstr/array-rest-put-let.js (sloppy)",
			"statements/for-of/dstr/array-rest-put-let.js (strict)",
			"statements/for-of/dstr/obj-id-init-let.js (sloppy)",
			"statements/for-of/dstr/obj-id-init-let.js (strict)",
			"statements/for-of/dstr/obj-id-put-let.js (sloppy)",
			"statements/for-of/dstr/obj-id-put-let.js (strict)",
			"statements/for-of/dstr/obj-prop-elem-init-let.js (sloppy)",
			"statements/for-of/dstr/obj-prop-elem-init-let.js (strict)",
			"statements/for-of/dstr/obj-prop-put-let.js (sloppy)",
			"statements/for-of/dstr/obj-prop-put-let.js (strict)",
			"statements/for-of/scope-body-lex-open.js (sloppy)",
			"statements/for-of/scope-body-lex-open.js (strict)",
			"statements/for-of/scope-head-lex-close.js (sloppy)",
			"statements/for-of/scope-head-lex-close.js (strict)",
			"statements/for-of/scope-head-lex-open.js (sloppy)",
			"statements/for-of/scope-head-lex-open.js (strict)",
			"statements/function/13.2-2-s.js (strict)",
			"statements/function/13.2-21-s.js (sloppy)",
			"statements/function/13.2-22-s.js (sloppy)",
			"statements/function/13.2-25-s.js (sloppy)",
			"statements/function/13.2-26-s.js (sloppy)",
			"statements/function/13.2-4-s.js (strict)",
			"statements/let/block-local-closure-get-before-initialization.js (sloppy)",
			"statements/let/block-local-closure-get-before-initialization.js (strict)",
			"statements/let/block-local-closure-set-before-initialization.js (sloppy)",
			"statements/let/block-local-closure-set-before-initialization.js (strict)",
			"statements/let/block-local-use-before-initialization-in-declaration-statement.js (sloppy)",
			"statements/let/block-local-use-before-initialization-in-declaration-statement.js (strict)",
			"statements/let/block-local-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/let/block-local-use-before-initialization-in-prior-statement.js (strict)",
			"statements/let/function-local-closure-get-before-initialization.js (sloppy)",
			"statements/let/function-local-closure-get-before-initialization.js (strict)",
			"statements/let/function-local-closure-set-before-initialization.js (sloppy)",
			"statements/let/function-local-closure-set-before-initialization.js (strict)",
			"statements/let/function-local-use-before-initialization-in-declaration-statement.js (sloppy)",
			"statements/let/function-local-use-before-initialization-in-declaration-statement.js (strict)",
			"statements/let/function-local-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/let/function-local-use-before-initialization-in-prior-statement.js (strict)",
			"statements/let/global-closure-get-before-initialization.js (sloppy)",
			"statements/let/global-closure-get-before-initialization.js (strict)",
			"statements/let/global-closure-set-before-initialization.js (sloppy)",
			"statements/let/global-closure-set-before-initialization.js (strict)",
			"statements/switch/scope-lex-async-function.js (sloppy)",
			"statements/switch/scope-lex-async-generator.js (sloppy)",
			"statements/switch/scope-lex-generator.js (sloppy)",
			"statements/using/block-local-closure-get-before-initialization.js (strict)",
			"statements/using/block-local-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/using/block-local-use-before-initialization-in-prior-statement.js (strict)",
			"statements/using/function-local-closure-get-before-initialization.js (sloppy)",
			"statements/using/function-local-closure-get-before-initialization.js (strict)",
			"statements/using/function-local-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/using/function-local-use-before-initialization-in-prior-statement.js (strict)",
			"statements/using/global-closure-get-before-initialization.js (strict)"
		]
	},
	{
		reason:
			"terser's parser refuses a program the spec allows, which fails the build",
		tests: [
			"eval-code/direct/async-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js (sloppy)",
			"eval-code/direct/async-func-decl-fn-body-cntns-arguments-lex-bind-declare-arguments.js (sloppy)",
			"eval-code/direct/async-func-expr-named-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js (sloppy)",
			"eval-code/direct/async-func-expr-named-fn-body-cntns-arguments-lex-bind-declare-arguments.js (sloppy)",
			"eval-code/direct/async-func-expr-nameless-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js (sloppy)",
			"eval-code/direct/async-func-expr-nameless-fn-body-cntns-arguments-lex-bind-declare-arguments.js (sloppy)",
			"eval-code/direct/async-meth-fn-body-cntns-arguments-lex-bind-declare-arguments-and-assign.js (sloppy)",
			"eval-code/direct/async-meth-fn-body-cntns-arguments-lex-bind-declare-arguments.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-break-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-case-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-catch-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-class-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-const-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-continue-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-debugger-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-default-escaped-ext.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-default-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-delete-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-do-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-else-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-enum-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-export-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-extends-escaped-ext.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-extends-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-finally-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-for-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-function-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-if-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-import-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-in-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-instanceof-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-let-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-new-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-return-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-super-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-switch-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-this-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-throw-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-try-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-typeof-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-var-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-void-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-while-escaped.js (sloppy)",
			"expressions/assignment/dstr/ident-name-prop-name-literal-with-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-break-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-break-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-case-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-case-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-catch-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-catch-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-class-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-class-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-const-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-const-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-continue-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-continue-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-debugger-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-debugger-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-default-escaped-ext.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-default-escaped-ext.js (strict)",
			"expressions/assignment/member-expr-ident-name-default-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-default-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-delete-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-delete-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-do-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-do-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-else-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-else-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-enum-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-enum-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-export-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-export-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-extends-escaped-ext.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-extends-escaped-ext.js (strict)",
			"expressions/assignment/member-expr-ident-name-extends-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-extends-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-finally-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-finally-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-for-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-for-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-function-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-function-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-if-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-if-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-import-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-import-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-in-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-in-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-instanceof-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-instanceof-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-let-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-let-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-new-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-new-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-return-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-return-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-super-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-super-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-switch-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-switch-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-this-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-this-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-throw-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-throw-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-try-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-try-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-typeof-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-typeof-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-var-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-var-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-void-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-void-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-while-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-while-escaped.js (strict)",
			"expressions/assignment/member-expr-ident-name-with-escaped.js (sloppy)",
			"expressions/assignment/member-expr-ident-name-with-escaped.js (strict)",
			"expressions/assignmenttargettype/simple-basic-identifierreference-await.js (strict)",
			"expressions/await/await-BindingIdentifier-in-global.js (strict)",
			"expressions/await/await-in-global.js (strict)",
			"expressions/await/await-in-nested-function.js (strict)",
			"expressions/await/await-in-nested-generator.js (strict)",
			"expressions/class/ident-name-method-def-break-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-break-escaped.js (strict)",
			"expressions/class/ident-name-method-def-case-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-case-escaped.js (strict)",
			"expressions/class/ident-name-method-def-catch-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-catch-escaped.js (strict)",
			"expressions/class/ident-name-method-def-class-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-class-escaped.js (strict)",
			"expressions/class/ident-name-method-def-const-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-const-escaped.js (strict)",
			"expressions/class/ident-name-method-def-continue-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-continue-escaped.js (strict)",
			"expressions/class/ident-name-method-def-debugger-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-debugger-escaped.js (strict)",
			"expressions/class/ident-name-method-def-default-escaped-ext.js (sloppy)",
			"expressions/class/ident-name-method-def-default-escaped-ext.js (strict)",
			"expressions/class/ident-name-method-def-default-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-default-escaped.js (strict)",
			"expressions/class/ident-name-method-def-delete-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-delete-escaped.js (strict)",
			"expressions/class/ident-name-method-def-do-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-do-escaped.js (strict)",
			"expressions/class/ident-name-method-def-else-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-else-escaped.js (strict)",
			"expressions/class/ident-name-method-def-enum-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-enum-escaped.js (strict)",
			"expressions/class/ident-name-method-def-export-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-export-escaped.js (strict)",
			"expressions/class/ident-name-method-def-extends-escaped-ext.js (sloppy)",
			"expressions/class/ident-name-method-def-extends-escaped-ext.js (strict)",
			"expressions/class/ident-name-method-def-extends-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-extends-escaped.js (strict)",
			"expressions/class/ident-name-method-def-finally-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-finally-escaped.js (strict)",
			"expressions/class/ident-name-method-def-for-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-for-escaped.js (strict)",
			"expressions/class/ident-name-method-def-function-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-function-escaped.js (strict)",
			"expressions/class/ident-name-method-def-if-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-if-escaped.js (strict)",
			"expressions/class/ident-name-method-def-import-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-import-escaped.js (strict)",
			"expressions/class/ident-name-method-def-in-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-in-escaped.js (strict)",
			"expressions/class/ident-name-method-def-instanceof-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-instanceof-escaped.js (strict)",
			"expressions/class/ident-name-method-def-let-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-let-escaped.js (strict)",
			"expressions/class/ident-name-method-def-new-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-new-escaped.js (strict)",
			"expressions/class/ident-name-method-def-return-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-return-escaped.js (strict)",
			"expressions/class/ident-name-method-def-super-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-super-escaped.js (strict)",
			"expressions/class/ident-name-method-def-switch-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-switch-escaped.js (strict)",
			"expressions/class/ident-name-method-def-this-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-this-escaped.js (strict)",
			"expressions/class/ident-name-method-def-throw-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-throw-escaped.js (strict)",
			"expressions/class/ident-name-method-def-try-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-try-escaped.js (strict)",
			"expressions/class/ident-name-method-def-typeof-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-typeof-escaped.js (strict)",
			"expressions/class/ident-name-method-def-var-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-var-escaped.js (strict)",
			"expressions/class/ident-name-method-def-void-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-void-escaped.js (strict)",
			"expressions/class/ident-name-method-def-while-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-while-escaped.js (strict)",
			"expressions/class/ident-name-method-def-with-escaped.js (sloppy)",
			"expressions/class/ident-name-method-def-with-escaped.js (strict)",
			"expressions/function/arguments-with-arguments-lex.js (sloppy)",
			"expressions/generators/arguments-with-arguments-lex.js (sloppy)",
			"expressions/generators/yield-as-function-expression-binding-identifier.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-break-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-break-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-case-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-case-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-catch-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-catch-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-class-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-class-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-const-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-const-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-continue-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-continue-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-debugger-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-debugger-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-default-escaped-ext.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-default-escaped-ext.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-default-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-default-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-delete-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-delete-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-do-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-do-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-else-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-else-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-enum-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-enum-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-export-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-export-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-extends-escaped-ext.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-extends-escaped-ext.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-extends-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-extends-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-finally-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-finally-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-for-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-for-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-function-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-function-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-if-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-if-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-import-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-import-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-in-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-in-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-instanceof-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-instanceof-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-let-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-let-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-new-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-new-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-return-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-return-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-super-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-super-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-switch-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-switch-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-this-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-this-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-throw-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-throw-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-try-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-try-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-typeof-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-typeof-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-var-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-var-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-void-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-void-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-while-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-while-escaped.js (strict)",
			"expressions/object/covered-ident-name-prop-name-literal-with-escaped.js (sloppy)",
			"expressions/object/covered-ident-name-prop-name-literal-with-escaped.js (strict)",
			"expressions/object/ident-name-method-def-break-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-break-escaped.js (strict)",
			"expressions/object/ident-name-method-def-case-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-case-escaped.js (strict)",
			"expressions/object/ident-name-method-def-catch-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-catch-escaped.js (strict)",
			"expressions/object/ident-name-method-def-class-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-class-escaped.js (strict)",
			"expressions/object/ident-name-method-def-const-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-const-escaped.js (strict)",
			"expressions/object/ident-name-method-def-continue-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-continue-escaped.js (strict)",
			"expressions/object/ident-name-method-def-debugger-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-debugger-escaped.js (strict)",
			"expressions/object/ident-name-method-def-default-escaped-ext.js (sloppy)",
			"expressions/object/ident-name-method-def-default-escaped-ext.js (strict)",
			"expressions/object/ident-name-method-def-default-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-default-escaped.js (strict)",
			"expressions/object/ident-name-method-def-delete-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-delete-escaped.js (strict)",
			"expressions/object/ident-name-method-def-do-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-do-escaped.js (strict)",
			"expressions/object/ident-name-method-def-else-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-else-escaped.js (strict)",
			"expressions/object/ident-name-method-def-enum-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-enum-escaped.js (strict)",
			"expressions/object/ident-name-method-def-export-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-export-escaped.js (strict)",
			"expressions/object/ident-name-method-def-extends-escaped-ext.js (sloppy)",
			"expressions/object/ident-name-method-def-extends-escaped-ext.js (strict)",
			"expressions/object/ident-name-method-def-extends-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-extends-escaped.js (strict)",
			"expressions/object/ident-name-method-def-finally-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-finally-escaped.js (strict)",
			"expressions/object/ident-name-method-def-for-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-for-escaped.js (strict)",
			"expressions/object/ident-name-method-def-function-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-function-escaped.js (strict)",
			"expressions/object/ident-name-method-def-if-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-if-escaped.js (strict)",
			"expressions/object/ident-name-method-def-import-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-import-escaped.js (strict)",
			"expressions/object/ident-name-method-def-in-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-in-escaped.js (strict)",
			"expressions/object/ident-name-method-def-instanceof-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-instanceof-escaped.js (strict)",
			"expressions/object/ident-name-method-def-let-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-let-escaped.js (strict)",
			"expressions/object/ident-name-method-def-new-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-new-escaped.js (strict)",
			"expressions/object/ident-name-method-def-return-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-return-escaped.js (strict)",
			"expressions/object/ident-name-method-def-super-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-super-escaped.js (strict)",
			"expressions/object/ident-name-method-def-switch-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-switch-escaped.js (strict)",
			"expressions/object/ident-name-method-def-this-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-this-escaped.js (strict)",
			"expressions/object/ident-name-method-def-throw-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-throw-escaped.js (strict)",
			"expressions/object/ident-name-method-def-try-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-try-escaped.js (strict)",
			"expressions/object/ident-name-method-def-typeof-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-typeof-escaped.js (strict)",
			"expressions/object/ident-name-method-def-var-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-var-escaped.js (strict)",
			"expressions/object/ident-name-method-def-void-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-void-escaped.js (strict)",
			"expressions/object/ident-name-method-def-while-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-while-escaped.js (strict)",
			"expressions/object/ident-name-method-def-with-escaped.js (sloppy)",
			"expressions/object/ident-name-method-def-with-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-break-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-break-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-case-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-case-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-catch-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-catch-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-class-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-class-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-const-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-const-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-continue-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-continue-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-debugger-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-debugger-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-default-escaped-ext.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-default-escaped-ext.js (strict)",
			"expressions/object/ident-name-prop-name-literal-default-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-default-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-delete-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-delete-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-do-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-do-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-else-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-else-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-enum-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-enum-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-export-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-export-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-extends-escaped-ext.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-extends-escaped-ext.js (strict)",
			"expressions/object/ident-name-prop-name-literal-extends-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-extends-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-finally-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-finally-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-for-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-for-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-function-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-function-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-if-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-if-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-import-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-import-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-in-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-in-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-instanceof-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-instanceof-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-let-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-let-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-new-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-new-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-return-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-return-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-super-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-super-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-switch-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-switch-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-this-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-this-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-throw-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-throw-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-try-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-try-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-typeof-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-typeof-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-var-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-var-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-void-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-void-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-while-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-while-escaped.js (strict)",
			"expressions/object/ident-name-prop-name-literal-with-escaped.js (sloppy)",
			"expressions/object/ident-name-prop-name-literal-with-escaped.js (strict)",
			"expressions/object/let-non-strict-access.js (sloppy)",
			"expressions/object/let-non-strict-syntax.js (sloppy)",
			"expressions/object/method-definition/yield-as-function-expression-binding-identifier.js (sloppy)",
			"expressions/tagged-template/invalid-escape-sequences.js (sloppy)",
			"expressions/tagged-template/invalid-escape-sequences.js (strict)",
			"import/import-attributes/text-javascript.js (module)",
			"module-code/top-level-await/await-expr-regexp.js (module)",
			"module-code/top-level-await/new-await-script-code.js (strict)",
			"module-code/top-level-await/syntax/block-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/export-class-decl-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/export-dflt-assign-expr-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/export-dft-class-decl-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/export-lex-decl-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/export-var-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/for-await-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/for-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/for-in-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/for-of-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/if-block-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/if-expr-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/top-level-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/try-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/typeof-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/void-await-expr-regexp.js (module)",
			"module-code/top-level-await/syntax/while-await-expr-regexp.js (module)",
			"statements/await-using/syntax/await-using-declaring-let-split-across-two-lines.js (sloppy)",
			"statements/class/elements/syntax/valid/grammar-field-named-get-followed-by-generator-asi.js (sloppy)",
			"statements/class/elements/syntax/valid/grammar-field-named-get-followed-by-generator-asi.js (strict)",
			"statements/class/elements/syntax/valid/grammar-field-named-set-followed-by-generator-asi.js (sloppy)",
			"statements/class/elements/syntax/valid/grammar-field-named-set-followed-by-generator-asi.js (strict)",
			"statements/class/ident-name-method-def-break-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-break-escaped.js (strict)",
			"statements/class/ident-name-method-def-case-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-case-escaped.js (strict)",
			"statements/class/ident-name-method-def-catch-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-catch-escaped.js (strict)",
			"statements/class/ident-name-method-def-class-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-class-escaped.js (strict)",
			"statements/class/ident-name-method-def-const-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-const-escaped.js (strict)",
			"statements/class/ident-name-method-def-continue-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-continue-escaped.js (strict)",
			"statements/class/ident-name-method-def-debugger-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-debugger-escaped.js (strict)",
			"statements/class/ident-name-method-def-default-escaped-ext.js (sloppy)",
			"statements/class/ident-name-method-def-default-escaped-ext.js (strict)",
			"statements/class/ident-name-method-def-default-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-default-escaped.js (strict)",
			"statements/class/ident-name-method-def-delete-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-delete-escaped.js (strict)",
			"statements/class/ident-name-method-def-do-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-do-escaped.js (strict)",
			"statements/class/ident-name-method-def-else-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-else-escaped.js (strict)",
			"statements/class/ident-name-method-def-enum-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-enum-escaped.js (strict)",
			"statements/class/ident-name-method-def-export-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-export-escaped.js (strict)",
			"statements/class/ident-name-method-def-extends-escaped-ext.js (sloppy)",
			"statements/class/ident-name-method-def-extends-escaped-ext.js (strict)",
			"statements/class/ident-name-method-def-extends-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-extends-escaped.js (strict)",
			"statements/class/ident-name-method-def-finally-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-finally-escaped.js (strict)",
			"statements/class/ident-name-method-def-for-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-for-escaped.js (strict)",
			"statements/class/ident-name-method-def-function-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-function-escaped.js (strict)",
			"statements/class/ident-name-method-def-if-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-if-escaped.js (strict)",
			"statements/class/ident-name-method-def-import-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-import-escaped.js (strict)",
			"statements/class/ident-name-method-def-in-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-in-escaped.js (strict)",
			"statements/class/ident-name-method-def-instanceof-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-instanceof-escaped.js (strict)",
			"statements/class/ident-name-method-def-let-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-let-escaped.js (strict)",
			"statements/class/ident-name-method-def-new-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-new-escaped.js (strict)",
			"statements/class/ident-name-method-def-return-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-return-escaped.js (strict)",
			"statements/class/ident-name-method-def-super-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-super-escaped.js (strict)",
			"statements/class/ident-name-method-def-switch-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-switch-escaped.js (strict)",
			"statements/class/ident-name-method-def-this-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-this-escaped.js (strict)",
			"statements/class/ident-name-method-def-throw-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-throw-escaped.js (strict)",
			"statements/class/ident-name-method-def-try-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-try-escaped.js (strict)",
			"statements/class/ident-name-method-def-typeof-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-typeof-escaped.js (strict)",
			"statements/class/ident-name-method-def-var-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-var-escaped.js (strict)",
			"statements/class/ident-name-method-def-void-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-void-escaped.js (strict)",
			"statements/class/ident-name-method-def-while-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-while-escaped.js (strict)",
			"statements/class/ident-name-method-def-with-escaped.js (sloppy)",
			"statements/class/ident-name-method-def-with-escaped.js (strict)",
			"statements/for-in/head-lhs-let.js (sloppy)",
			"statements/for-in/head-var-bound-names-let.js (sloppy)",
			"statements/for-in/identifier-let-allowed-as-lefthandside-expression-not-strict.js (sloppy)",
			"statements/for-of/head-var-bound-names-let.js (sloppy)",
			"statements/for/head-lhs-let.js (sloppy)",
			"statements/for/scope-head-lex-open.js (sloppy)",
			"statements/for/scope-head-lex-open.js (strict)",
			"statements/function/arguments-with-arguments-lex.js (sloppy)",
			"statements/generators/arguments-with-arguments-lex.js (sloppy)",
			"statements/generators/yield-as-function-expression-binding-identifier.js (sloppy)",
			"statements/generators/yield-as-generator-declaration-binding-identifier.js (sloppy)",
			"statements/let/syntax/escaped-let.js (sloppy)",
			"statements/using/syntax/using-declaring-let-split-across-two-lines.js (sloppy)",
			"white-space/after-regular-expression-literal-ogham-space.js (sloppy)",
			"white-space/after-regular-expression-literal-ogham-space.js (strict)"
		]
	},
	{
		reason: "terser changes what the program does",
		tests: [
			"expressions/addition/coerce-symbol-to-prim-invocation.js (sloppy)",
			"expressions/addition/coerce-symbol-to-prim-invocation.js (strict)",
			"expressions/class/elements/class-name-static-initializer-default-export.js (module)",
			"expressions/class/elements/class-name-static-initializer-expr.js (sloppy)",
			"expressions/class/elements/class-name-static-initializer-expr.js (strict)",
			"expressions/class/elements/private-async-generator-method-name.js (sloppy)",
			"expressions/class/elements/private-async-generator-method-name.js (strict)",
			"expressions/class/elements/private-async-method-name.js (sloppy)",
			"expressions/class/elements/private-async-method-name.js (strict)",
			"expressions/class/elements/private-generator-method-name.js (sloppy)",
			"expressions/class/elements/private-generator-method-name.js (strict)",
			"expressions/class/elements/private-static-async-generator-method-name.js (sloppy)",
			"expressions/class/elements/private-static-async-generator-method-name.js (strict)",
			"expressions/class/elements/private-static-async-method-name.js (sloppy)",
			"expressions/class/elements/private-static-async-method-name.js (strict)",
			"expressions/class/elements/private-static-generator-method-name.js (sloppy)",
			"expressions/class/elements/private-static-generator-method-name.js (strict)",
			"expressions/class/elements/private-static-method-name.js (sloppy)",
			"expressions/class/elements/private-static-method-name.js (strict)",
			"expressions/class/elements/static-field-anonymous-function-name.js (sloppy)",
			"expressions/class/elements/static-field-anonymous-function-name.js (strict)",
			"expressions/equals/coerce-symbol-to-prim-invocation.js (sloppy)",
			"expressions/equals/coerce-symbol-to-prim-invocation.js (strict)",
			"expressions/exponentiation/exp-operator-evaluation-order.js (sloppy)",
			"expressions/exponentiation/exp-operator-evaluation-order.js (strict)",
			"expressions/exponentiation/exp-operator-precedence-unary-expression-semantics.js (sloppy)",
			"expressions/exponentiation/exp-operator-precedence-unary-expression-semantics.js (strict)",
			"expressions/instanceof/S11.8.6_A3.js (sloppy)",
			"expressions/instanceof/S11.8.6_A3.js (strict)",
			"expressions/instanceof/S11.8.6_A6_T1.js (sloppy)",
			"expressions/instanceof/S11.8.6_A6_T1.js (strict)",
			"expressions/instanceof/S11.8.6_A6_T2.js (sloppy)",
			"expressions/instanceof/S11.8.6_A6_T2.js (strict)",
			"expressions/instanceof/S11.8.6_A6_T4.js (sloppy)",
			"expressions/instanceof/S11.8.6_A6_T4.js (strict)",
			"expressions/instanceof/S15.3.5.3_A2_T2.js (sloppy)",
			"expressions/instanceof/S15.3.5.3_A2_T2.js (strict)",
			"expressions/instanceof/S15.3.5.3_A2_T5.js (sloppy)",
			"expressions/instanceof/S15.3.5.3_A2_T5.js (strict)",
			"expressions/instanceof/S15.3.5.3_A2_T6.js (sloppy)",
			"expressions/instanceof/S15.3.5.3_A2_T6.js (strict)",
			"expressions/instanceof/symbol-hasinstance-invocation.js (sloppy)",
			"expressions/instanceof/symbol-hasinstance-invocation.js (strict)",
			"expressions/object/object-spread-proxy-no-excluded-keys.js (sloppy)",
			"expressions/object/object-spread-proxy-no-excluded-keys.js (strict)",
			"expressions/object/object-spread-proxy-ownkeys-returned-keys-order.js (sloppy)",
			"expressions/object/object-spread-proxy-ownkeys-returned-keys-order.js (strict)",
			"expressions/optional-chaining/member-expression.js (sloppy)",
			"expressions/optional-chaining/member-expression.js (strict)",
			"import/import-defer/evaluation-triggers/trigger-exported-string-hasProperty-in-prototype.js (module)",
			"import/import-defer/evaluation-triggers/trigger-exported-string-hasProperty.js (module)",
			"import/import-defer/evaluation-triggers/trigger-not-exported-string-hasProperty-in-prototype.js (module)",
			"import/import-defer/evaluation-triggers/trigger-not-exported-string-hasProperty.js (module)",
			"literals/string/line-continuation-double.js (sloppy)",
			"literals/string/line-continuation-double.js (strict)",
			"literals/string/line-continuation-single.js (sloppy)",
			"literals/string/line-continuation-single.js (strict)",
			"statements/async-generator/return-undefined-implicit-and-explicit.js (sloppy)",
			"statements/async-generator/return-undefined-implicit-and-explicit.js (strict)",
			"statements/class/elements/private-async-generator-method-name.js (sloppy)",
			"statements/class/elements/private-async-generator-method-name.js (strict)",
			"statements/class/elements/private-async-method-name.js (sloppy)",
			"statements/class/elements/private-async-method-name.js (strict)",
			"statements/class/elements/private-generator-method-name.js (sloppy)",
			"statements/class/elements/private-generator-method-name.js (strict)",
			"statements/class/elements/private-static-async-generator-method-name.js (sloppy)",
			"statements/class/elements/private-static-async-generator-method-name.js (strict)",
			"statements/class/elements/private-static-async-method-name.js (sloppy)",
			"statements/class/elements/private-static-async-method-name.js (strict)",
			"statements/class/elements/private-static-generator-method-name.js (sloppy)",
			"statements/class/elements/private-static-generator-method-name.js (strict)",
			"statements/class/elements/private-static-method-name.js (sloppy)",
			"statements/class/elements/private-static-method-name.js (strict)",
			"statements/class/elements/static-field-anonymous-function-name.js (sloppy)",
			"statements/class/elements/static-field-anonymous-function-name.js (strict)",
			"statements/const/global-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/const/global-use-before-initialization-in-prior-statement.js (strict)",
			"statements/for/scope-body-lex-open.js (sloppy)",
			"statements/for/scope-body-lex-open.js (strict)",
			"statements/let/global-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/let/global-use-before-initialization-in-prior-statement.js (strict)",
			"statements/switch/scope-lex-open-case.js (sloppy)",
			"statements/switch/scope-lex-open-case.js (strict)",
			"statements/using/global-use-before-initialization-in-prior-statement.js (sloppy)",
			"statements/using/global-use-before-initialization-in-prior-statement.js (strict)",
			"statements/with/has-binding-idref-with-proxy-env.js (sloppy)",
			"types/reference/put-value-prop-base-primitive.js (sloppy)"
		]
	},
	{
		reason:
			"terser assumes `toString` and `valueOf` have no effects, as its documentation states",
		tests: [
			"expressions/addition/order-of-evaluation.js (sloppy)",
			"expressions/addition/order-of-evaluation.js (strict)",
			"expressions/bitwise-and/order-of-evaluation.js (sloppy)",
			"expressions/bitwise-and/order-of-evaluation.js (strict)",
			"expressions/bitwise-or/order-of-evaluation.js (sloppy)",
			"expressions/bitwise-or/order-of-evaluation.js (strict)",
			"expressions/bitwise-xor/order-of-evaluation.js (sloppy)",
			"expressions/bitwise-xor/order-of-evaluation.js (strict)",
			"expressions/division/order-of-evaluation.js (sloppy)",
			"expressions/division/order-of-evaluation.js (strict)",
			"expressions/does-not-equals/S11.9.2_A7.8.js (sloppy)",
			"expressions/does-not-equals/S11.9.2_A7.8.js (strict)",
			"expressions/exponentiation/order-of-evaluation.js (sloppy)",
			"expressions/exponentiation/order-of-evaluation.js (strict)",
			"expressions/in/S11.8.7_A3.js (sloppy)",
			"expressions/in/S11.8.7_A3.js (strict)",
			"expressions/left-shift/order-of-evaluation.js (sloppy)",
			"expressions/left-shift/order-of-evaluation.js (strict)",
			"expressions/modulus/order-of-evaluation.js (sloppy)",
			"expressions/modulus/order-of-evaluation.js (strict)",
			"expressions/multiplication/order-of-evaluation.js (sloppy)",
			"expressions/multiplication/order-of-evaluation.js (strict)",
			"expressions/right-shift/order-of-evaluation.js (sloppy)",
			"expressions/right-shift/order-of-evaluation.js (strict)",
			"expressions/subtraction/order-of-evaluation.js (sloppy)",
			"expressions/subtraction/order-of-evaluation.js (strict)",
			"expressions/unsigned-right-shift/S11.7.3_A2.2_T1.js (sloppy)",
			"expressions/unsigned-right-shift/S11.7.3_A2.2_T1.js (strict)",
			"expressions/unsigned-right-shift/bigint-toprimitive.js (sloppy)",
			"expressions/unsigned-right-shift/bigint-toprimitive.js (strict)",
			"expressions/unsigned-right-shift/order-of-evaluation.js (sloppy)",
			"expressions/unsigned-right-shift/order-of-evaluation.js (strict)"
		]
	},
	{
		reason: "terser writes a program that reads a binding outside its scope",
		tests: [
			"expressions/arrow-function/scope-paramsbody-var-open.js (sloppy)",
			"expressions/arrow-function/scope-paramsbody-var-open.js (strict)",
			"expressions/class/scope-gen-meth-paramsbody-var-open.js (sloppy)",
			"expressions/class/scope-gen-meth-paramsbody-var-open.js (strict)",
			"expressions/class/scope-meth-paramsbody-var-open.js (sloppy)",
			"expressions/class/scope-meth-paramsbody-var-open.js (strict)",
			"expressions/class/scope-setter-paramsbody-var-open.js (sloppy)",
			"expressions/class/scope-setter-paramsbody-var-open.js (strict)",
			"expressions/class/scope-static-gen-meth-paramsbody-var-open.js (sloppy)",
			"expressions/class/scope-static-gen-meth-paramsbody-var-open.js (strict)",
			"expressions/class/scope-static-meth-paramsbody-var-open.js (sloppy)",
			"expressions/class/scope-static-meth-paramsbody-var-open.js (strict)",
			"expressions/class/scope-static-setter-paramsbody-var-open.js (sloppy)",
			"expressions/class/scope-static-setter-paramsbody-var-open.js (strict)",
			"expressions/function/scope-paramsbody-var-open.js (sloppy)",
			"expressions/function/scope-paramsbody-var-open.js (strict)",
			"expressions/generators/scope-paramsbody-var-open.js (sloppy)",
			"expressions/generators/scope-paramsbody-var-open.js (strict)",
			"expressions/object/scope-gen-meth-paramsbody-var-open.js (sloppy)",
			"expressions/object/scope-gen-meth-paramsbody-var-open.js (strict)",
			"expressions/object/scope-meth-paramsbody-var-open.js (sloppy)",
			"expressions/object/scope-meth-paramsbody-var-open.js (strict)",
			"expressions/object/scope-setter-paramsbody-var-open.js (sloppy)",
			"expressions/object/scope-setter-paramsbody-var-open.js (strict)",
			"statements/class/scope-gen-meth-paramsbody-var-open.js (sloppy)",
			"statements/class/scope-gen-meth-paramsbody-var-open.js (strict)",
			"statements/class/scope-meth-paramsbody-var-open.js (sloppy)",
			"statements/class/scope-meth-paramsbody-var-open.js (strict)",
			"statements/class/scope-setter-paramsbody-var-open.js (sloppy)",
			"statements/class/scope-setter-paramsbody-var-open.js (strict)",
			"statements/class/scope-static-gen-meth-paramsbody-var-open.js (sloppy)",
			"statements/class/scope-static-gen-meth-paramsbody-var-open.js (strict)",
			"statements/class/scope-static-meth-paramsbody-var-open.js (sloppy)",
			"statements/class/scope-static-meth-paramsbody-var-open.js (strict)",
			"statements/class/scope-static-setter-paramsbody-var-open.js (sloppy)",
			"statements/class/scope-static-setter-paramsbody-var-open.js (strict)",
			"statements/function/scope-paramsbody-var-open.js (sloppy)",
			"statements/function/scope-paramsbody-var-open.js (strict)",
			"statements/generators/scope-paramsbody-var-open.js (sloppy)",
			"statements/generators/scope-paramsbody-var-open.js (strict)",
			"statements/try/scope-catch-block-lex-open.js (sloppy)",
			"statements/try/scope-catch-block-lex-open.js (strict)"
		]
	},
	{
		reason:
			"terser renames a binding or private name that a function takes its name from",
		tests: [
			"expressions/async-function/name.js (sloppy)",
			"expressions/async-function/name.js (strict)",
			"expressions/async-generator/name.js (sloppy)",
			"expressions/async-generator/name.js (strict)",
			"expressions/class/elements/private-methods/prod-private-async-generator.js (sloppy)",
			"expressions/class/elements/private-methods/prod-private-async-generator.js (strict)",
			"expressions/class/elements/private-methods/prod-private-async-method.js (sloppy)",
			"expressions/class/elements/private-methods/prod-private-async-method.js (strict)",
			"expressions/class/elements/private-methods/prod-private-generator.js (sloppy)",
			"expressions/class/elements/private-methods/prod-private-generator.js (strict)",
			"expressions/class/elements/private-methods/prod-private-method.js (sloppy)",
			"expressions/class/elements/private-methods/prod-private-method.js (strict)",
			"expressions/class/name.js (sloppy)",
			"expressions/class/name.js (strict)",
			"expressions/dynamic-import/eval-export-dflt-cls-anon.js (module)",
			"expressions/dynamic-import/eval-export-dflt-cls-named.js (module)",
			"expressions/dynamic-import/eval-export-dflt-expr-cls-anon.js (module)",
			"expressions/dynamic-import/eval-export-dflt-expr-cls-named.js (module)",
			"expressions/dynamic-import/eval-export-dflt-expr-fn-named.js (module)",
			"expressions/dynamic-import/eval-export-dflt-expr-gen-named.js (module)",
			"expressions/function/name.js (sloppy)",
			"expressions/function/name.js (strict)",
			"expressions/generators/name.js (sloppy)",
			"expressions/generators/name.js (strict)",
			"module-code/eval-export-dflt-cls-anon.js (module)",
			"module-code/eval-export-dflt-cls-named.js (module)",
			"module-code/eval-export-dflt-expr-cls-anon.js (module)",
			"module-code/eval-export-dflt-expr-cls-named.js (module)",
			"module-code/eval-export-dflt-expr-fn-named.js (module)",
			"module-code/eval-export-dflt-expr-gen-named.js (module)",
			"module-code/instn-named-bndng-dflt-fun-named.js (module)",
			"module-code/instn-named-bndng-dflt-gen-named.js (module)",
			"statements/class/elements/private-methods/prod-private-async-generator.js (sloppy)",
			"statements/class/elements/private-methods/prod-private-async-generator.js (strict)",
			"statements/class/elements/private-methods/prod-private-async-method.js (sloppy)",
			"statements/class/elements/private-methods/prod-private-async-method.js (strict)",
			"statements/class/elements/private-methods/prod-private-generator.js (sloppy)",
			"statements/class/elements/private-methods/prod-private-generator.js (strict)",
			"statements/class/elements/private-methods/prod-private-method.js (sloppy)",
			"statements/class/elements/private-methods/prod-private-method.js (strict)"
		]
	},
	{
		reason: "terser writes a program that no longer parses",
		tests: [
			"expressions/await/await-in-nested-function.js (sloppy)",
			"expressions/dynamic-import/import-attributes/2nd-param-await-ident.js (strict)",
			"expressions/in/private-field-rhs-yield-present.js (sloppy)",
			"expressions/in/private-field-rhs-yield-present.js (strict)",
			"expressions/new.target/unary-expr.js (sloppy)",
			"expressions/new.target/unary-expr.js (strict)",
			"expressions/object/method-definition/async-returns-async-arrow-returns-newtarget.js (sloppy)",
			"expressions/object/method-definition/async-returns-async-arrow-returns-newtarget.js (strict)",
			"global-code/return.js (sloppy)",
			"global-code/return.js (strict)",
			"statements/class/elements/fields-hash-constructor-is-a-valid-name.js (sloppy)",
			"statements/class/elements/fields-hash-constructor-is-a-valid-name.js (strict)",
			"statements/class/elements/private-field-is-visible-in-computed-properties.js (sloppy)",
			"statements/class/elements/private-field-is-visible-in-computed-properties.js (strict)",
			"statements/class/elements/private-field-visible-to-direct-eval-on-initializer.js (sloppy)",
			"statements/class/elements/private-field-visible-to-direct-eval-on-initializer.js (strict)",
			"statements/class/elements/private-field-visible-to-direct-eval.js (sloppy)",
			"statements/class/elements/private-field-visible-to-direct-eval.js (strict)",
			"statements/class/elements/private-field-with-initialized-id-is-visible-in-computed-properties.js (sloppy)",
			"statements/class/elements/private-field-with-initialized-id-is-visible-in-computed-properties.js (strict)",
			"statements/class/elements/private-getter-visible-to-direct-eval-on-initializer.js (sloppy)",
			"statements/class/elements/private-getter-visible-to-direct-eval-on-initializer.js (strict)",
			"statements/class/elements/private-getter-visible-to-direct-eval.js (sloppy)",
			"statements/class/elements/private-getter-visible-to-direct-eval.js (strict)",
			"statements/class/elements/private-method-visible-to-direct-eval-on-initializer.js (sloppy)",
			"statements/class/elements/private-method-visible-to-direct-eval-on-initializer.js (strict)",
			"statements/class/elements/private-method-visible-to-direct-eval.js (sloppy)",
			"statements/class/elements/private-method-visible-to-direct-eval.js (strict)",
			"statements/class/elements/private-setter-visible-to-direct-eval-on-initializer.js (sloppy)",
			"statements/class/elements/private-setter-visible-to-direct-eval-on-initializer.js (strict)",
			"statements/class/elements/private-setter-visible-to-direct-eval.js (sloppy)",
			"statements/class/elements/private-setter-visible-to-direct-eval.js (strict)",
			"statements/class/elements/private-static-field-visible-to-direct-eval.js (sloppy)",
			"statements/class/elements/private-static-field-visible-to-direct-eval.js (strict)",
			"statements/class/elements/private-static-getter-visible-to-direct-eval.js (sloppy)",
			"statements/class/elements/private-static-getter-visible-to-direct-eval.js (strict)",
			"statements/class/elements/private-static-method-visible-to-direct-eval.js (sloppy)",
			"statements/class/elements/private-static-method-visible-to-direct-eval.js (strict)",
			"statements/class/elements/private-static-setter-visible-to-direct-eval.js (sloppy)",
			"statements/class/elements/private-static-setter-visible-to-direct-eval.js (strict)",
			"statements/for-await-of/let-block-with-newline.js (sloppy)",
			"statements/for-in/let-block-with-newline.js (sloppy)",
			"statements/for-of/head-lhs-async-escaped.js (sloppy)",
			"statements/for-of/head-lhs-async-escaped.js (strict)",
			"statements/for-of/head-lhs-async-parens.js (sloppy)",
			"statements/for-of/head-lhs-async-parens.js (strict)",
			"statements/for-of/let-block-with-newline.js (sloppy)",
			"statements/return/S12.9_A1_T1.js (sloppy)",
			"statements/return/S12.9_A1_T1.js (strict)",
			"statements/return/S12.9_A1_T10.js (sloppy)",
			"statements/return/S12.9_A1_T10.js (strict)",
			"statements/return/S12.9_A1_T2.js (sloppy)",
			"statements/return/S12.9_A1_T2.js (strict)",
			"statements/return/S12.9_A1_T3.js (sloppy)",
			"statements/return/S12.9_A1_T3.js (strict)",
			"statements/return/S12.9_A1_T4.js (sloppy)",
			"statements/return/S12.9_A1_T4.js (strict)",
			"statements/return/S12.9_A1_T5.js (sloppy)",
			"statements/return/S12.9_A1_T5.js (strict)",
			"statements/return/S12.9_A1_T6.js (sloppy)",
			"statements/return/S12.9_A1_T6.js (strict)",
			"statements/return/S12.9_A1_T7.js (sloppy)",
			"statements/return/S12.9_A1_T7.js (strict)",
			"statements/return/S12.9_A1_T8.js (sloppy)",
			"statements/return/S12.9_A1_T8.js (strict)",
			"statements/return/S12.9_A1_T9.js (sloppy)",
			"statements/return/S12.9_A1_T9.js (strict)"
		]
	},
	{
		reason:
			"terser folds an expression that throws when it runs, which fails the build",
		tests: [
			"expressions/modulus/bigint-modulo-zero.js (sloppy)",
			"expressions/modulus/bigint-modulo-zero.js (strict)",
			"expressions/unary-plus/bigint-throws.js (sloppy)",
			"expressions/unary-plus/bigint-throws.js (strict)"
		]
	}
];
/* cspell:enable */

// The minified mode's failing tests, by `name (scenario)`, with the reason.
/** @type {Map<string, string>} */
const minifiedFailures = new Map();
for (const { reason, tests } of MINIFIED_FAILURES) {
	for (const test of tests) minifiedFailures.set(test, reason);
}

// Each mode the suite builds with.
const MODES = [
	{ name: "development", mode: "development" },
	{ name: "production", mode: "production", minify: true }
];

const compile = async (entry, scenario, options = {}) =>
	new Promise((resolve, reject) => {
		const { exportsPresence, minify, ...webpackOptions } = options;
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
				minimize: Boolean(minify),
				// The plugin and minify function production uses, run in this process:
				// a worker pool per build would cost more than the build.
				...(minify && {
					minimizer: [
						new MinimizerPlugin({
							test: /\.[cm]?js$/i,
							minify: jsMinify,
							minimizerOptions: MINIFY,
							parallel: false
						})
					]
				})
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
	for (const { name: modeName, mode, minify } of MODES) {
		describe(modeName, () => {
			for (const testFile of shardedTestFiles) {
				const name = path.posix.relative(baseDir, testFile);
				const outputPath = path.resolve(
					__dirname,
					"../js/test262-cases",
					minify ? `${mode}-minified` : mode,
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
						deliberateProductionDivergences.includes(name)) ||
					(minify !== undefined && renamedByMinifier.test(name))
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
					const runCase = async () => {
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
							minify,
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
					};
					const expected =
						minify === undefined
							? undefined
							: minifiedFailures.get(`${name} (${scenario})`);

					it(`${name} ("${scenario}")`, async () => {
						if (expected === undefined) return runCase();
						let failed = false;
						try {
							await runCase();
						} catch (_err) {
							failed = true;
						}
						// An async case can fail after its body settles, as a rejection
						// nothing handles; drain those and count them as its failure.
						await new Promise((resolve) => {
							setImmediate(resolve);
						});
						const runningTest =
							globalThis.JEST_STATE_SYMBOL &&
							globalThis.JEST_STATE_SYMBOL.currentlyRunningTest;
						const byPromise =
							runningTest && runningTest.unhandledRejectionErrorByPromise;
						if (byPromise && byPromise.size > 0) {
							failed = true;
							byPromise.clear();
						}
						if (failed) return;
						throw new Error(
							`${name} ("${scenario}") passes under ${modeName} now: remove it from MINIFIED_FAILURES (${expected})`
						);
					});
				}
			}
		});
	}
});
