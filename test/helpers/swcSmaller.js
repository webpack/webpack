"use strict";

// cspell:ignore argnames autowhatever chartjs concattenating cryptojs defun dont farg fargs firestore forof funarg hoofd instancesearch joda lvalues nonmatching outstatic redef syncfusion noinline assignement

// What swc's minifier does that webpack's does not yet, each with the tests
// whose output under their own options is bigger than swc's recorded one.
// Biggest group first: retire a test once it is no longer bigger.

/** @type {[string, string[]][]} */
const SWC_SMALLER_BY_REASON = [
	[
		"real-world code, where no one transform above accounts for half the gap: several cut opposite ways, or the rival restructures the program too far for a token diff to attribute",
		[
			"swc minifier: fixture/next/wrap-contracts/input.js",
			"swc minifier: fixture/issues/12209/input.js",
			"swc minifier: fixture/issues/arguments-canonical-index/input.js"
		]
	],
	[
		"webpack writes the same program in a spelling longer or compressing worse than swc's: `,` where swc keeps `;` between statements, operand order, `{0}` for an empty body",
		[
			"swc minifier: fixture/projects/mootools/3/input.js",
			"swc minifier: fixture/projects/yui/12/input.js",
			"swc minifier: fixture/projects/yui/9/input.js",
			"swc minifier: fixture/terser/issue-2535-2/2/input.js",
			"terser compress: collapse_vars/collapse_rhs_conditional_2",
			"terser compress: comparing/self_comparison_2",
			"terser compress: conditionals/cond_7_1",
			"terser compress: conditionals/ifs_3_should_warn",
			"terser compress: const/issue_1396",
			"terser compress: harmony/shorthand_keywords",
			"terser compress: issue-1704/mangle_catch_redef_3",
			"terser compress: loops/issue_186_beautify_braces",
			"terser compress: loops/issue_186_braces",
			"terser compress: properties/join_object_assignments_NaN_1",
			"terser compress: pure_getters/set_immutable_5",
			"terser compress: dead-code/collapse_vars_lvalues_drop_assign",
			"terser compress: destructuring/issue_t111_1",
			"terser compress: destructuring/issue_t111_3",
			"terser compress: evaluate/pow_with_number_constants",
			"terser compress: functions/issue_2476",
			"terser compress: global_defs/mixed",
			"terser compress: loops/keep_collapse_const_in_own_block_scope_2",
			"swc minifier: fixture/issues/10938/input.js",
			"swc minifier: fixture/issues/12195/nested-spread/input.js",
			"swc minifier: fixture/issues/12195/spread/input.js",
			"swc minifier: fixture/issues/12565/while_body/input.js",
			"swc minifier: fixture/issues/8228/input.js",
			"swc minifier: fixture/issues/8923/input.js",
			"swc minifier: fixture/issues/drop-console-value-refs/input.js",
			"swc minifier: fixture/issues/unused-let-initialization/input.js",
			"swc minifier: fixture/projects/underscore/18/input.js",
			"swc minifier: full/size/40a586d8ac72ba5686c4b250184acfa11620d814/input.js",
			"swc minifier: pass-1/issue-6123/1/input.js",
			"swc minifier: fixture/projects/yui/3/input.js",
			"swc minifier: projects/files/yui-3.12.0.js",
			"swc minifier: fixture/issues/6957/exponential/input.js",
			"swc minifier: fixture/issues/6957/number-tostring/input.js",
			"swc minifier: fixture/issues/8465/input.js",
			"swc minifier: fixture/issues/non-finite-number-method-call/input.js",
			"swc minifier: fixture/projects/backbone/18/input.js",
			"swc minifier: fixture/projects/wmr/archive-1/chunks/alias-outside.6e8773c7/input.js",
			"swc minifier: fixture/projects/wmr/archive-1/chunks/index.5a544c41/input.js",
			"swc minifier: full/helpers/1/input.js"
		]
	],
	[
		"`,` vs `;` statements: the same statements joined into one sequence where the rival writes them apart, or a sequence's expressions lifted out or kept in another order",
		[
			"terser compress: arrow/issue_2271",
			"terser compress: async/async_shorthand_property",
			"terser compress: block-scope/switch_block_scope_mangler",
			"terser compress: collapse_vars/issue_1631_2",
			"terser compress: collapse_vars/issue_2365",
			"terser compress: collapse_vars/collapse_rhs_regexp",
			"terser compress: conditionals/trivial_boolean_ternary_expressions",
			"terser compress: destructuring/unused_destructuring_assign_2",
			"terser compress: evaluate/and",
			"terser compress: harmony/fat_arrow_as_param",
			"terser compress: harmony/array_spread_of_sequence",
			"terser compress: harmony/object_spread_of_sequence",
			"terser compress: harmony/array_literal_with_spread_3b",
			"terser compress: identity/inline_identity_lose_this",
			"terser compress: inline/noinline_annotation",
			"terser compress: issue-973/this_binding_collapse_vars",
			"terser compress: new/new_statement",
			"terser compress: new/new_constructor_with_unary_arguments",
			"terser compress: new/new_with_assignement_expression",
			"terser compress: reduce_vars/unsafe_evaluate_unknown",
			"terser compress: reduce_vars/defun_assign",
			"terser compress: reduce_vars/issue_3140_1",
			"terser compress: sandbox/console_log",
			"terser compress: switch/issue_1083_6",
			"terser compress: template-string/template_string_with_predefined_constants",
			"terser compress: template-string/tagged_template_with_invalid_escape",
			"terser compress: yield/issue_2832",
			"swc minifier: fixture/issues/11084/input.js",
			"swc minifier: fixture/issues/11089/input.js",
			"swc minifier: fixture/issues/11684/identifier-aliases/input.js",
			"swc minifier: fixture/issues/12182/callee-safety/direct-eval/input.js",
			"swc minifier: fixture/issues/12305/input.js",
			"swc minifier: fixture/issues/2044/full/input.js",
			"swc minifier: fixture/issues/5588/input.js",
			"swc minifier: fixture/issues/do-while-false-terminal-jump/side-effects/input.js",
			"swc minifier: fixture/projects/mootools/.11/input.js",
			"swc minifier: fixture/terser/issue-2535-2/2-1/input.js",
			"swc minifier: fixture/terser/issue-2535-2/3-1/input.js",
			"swc minifier: fixture/issues/11368/input.js",
			"swc minifier: fixture/issues/6957/2/input.js",
			"swc minifier: fixture/issues/react/hooks/1/input.js",
			"swc minifier: fixture/projects/jquery/20/input.js",
			"swc minifier: fixture/terser/issue-2435-1/2/input.js",
			"swc minifier: fixture/terser/issue-2535-2/1/input.js",
			"swc minifier: fixture/projects/react/15/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `reduce_vars` tests cover",
		[
			"terser compress: reduce_vars/defun_call",
			"terser compress: reduce_vars/issue_1670_6",
			"terser compress: reduce_vars/redefine_farg_3",
			"terser compress: reduce_vars/side_effects_assign",
			"terser compress: reduce_vars/obj_arg_1",
			"terser compress: reduce_vars/func_arg_1",
			"terser compress: reduce_vars/func_arg_2",
			"terser compress: reduce_vars/issue_2420_1",
			"terser compress: reduce_vars/issue_2420_2",
			"terser compress: reduce_vars/issue_2420_3",
			"terser compress: reduce_vars/issue_2423_2",
			"terser compress: reduce_vars/issue_2423_5",
			"terser compress: reduce_vars/issue_2423_6",
			"terser compress: reduce_vars/issue_2455",
			"terser compress: reduce_vars/defun_var_3",
			"terser compress: reduce_vars/duplicate_lambda_defun_name_2",
			"terser compress: reduce_vars/issue_2757_1",
			"terser compress: reduce_vars/issue_2757_2",
			"terser compress: reduce_vars/chained_assignments",
			"terser compress: reduce_vars/issue_3042_2",
			"terser compress: reduce_vars/issue_2919",
			"terser compress: reduce_vars/issue_3140_2",
			"terser compress: reduce_vars/variables_collision_in_immediately_invoked_func",
			"terser compress: reduce_vars/issue_308",
			"terser compress: reduce_vars/issue_294"
		]
	],
	[
		"swc inlines a function into its call site, where terser keeps the call: one used once, a small one used a few times, or an IIFE unwrapped into statements",
		[
			"swc minifier: fixture/issues/10876/1/input.js",
			"swc minifier: fixture/issues/10876/2/input.js",
			"swc minifier: fixture/issues/10876/3/input.js",
			"swc minifier: fixture/issues/11512-exhaustive/fn-multi-use-default-side-effect/input.js",
			"swc minifier: fixture/issues/11512-exhaustive/fn-multi-use-default-unused/input.js",
			"swc minifier: fixture/issues/11512-exhaustive/iife-default-side-effect/input.js",
			"swc minifier: fixture/issues/11512/input.js",
			"swc minifier: fixture/issues/11871/input.js",
			"swc minifier: fixture/issues/12128/input.js",
			"swc minifier: fixture/issues/12219/iife_rest_control_primitive/input.js",
			"swc minifier: fixture/issues/12226/input.js",
			"swc minifier: fixture/issues/12545/iife_rest_control_length/input.js",
			"swc minifier: fixture/issues/12545/iife_rest_control_once/input.js",
			"swc minifier: fixture/issues/6751/1/input.js",
			"swc minifier: fixture/issues/8271/input.js",
			"swc minifier: fixture/issues/9148/input.js",
			"swc minifier: fixture/issues/9468/input.js",
			"swc minifier: fixture/issues/9610-arrow-functions/input.js",
			"swc minifier: fixture/issues/cycle-1/input.js",
			"swc minifier: fixture/issues/cycle-2/input.js",
			"swc minifier: fixture/pr/7690/input.js",
			"swc minifier: full/issues/8288/input.js",
			"terser compress: collapse_vars/issue_2436_3",
			"terser compress: collapse_vars/issue_2436_5",
			"terser compress: functions/issue_2604_1",
			"terser compress: functions/issue_2616",
			"terser compress: functions/issue_2630_3",
			"terser compress: functions/issue_2630_4",
			"terser compress: functions/issue_2657",
			"terser compress: functions/issue_2663_2",
			"terser compress: functions/issue_2737_1",
			"terser compress: functions/issue_2737_2",
			"terser compress: functions/issue_2783",
			"terser compress: hoist_props/issue_2377_1",
			"terser compress: identity/inline_identity_higher_order",
			"terser compress: issue-t292/no_flatten_with_arg_colliding_with_arg_value_inner_scope",
			"terser compress: issue-t292/no_flatten_with_var_colliding_with_arg_value_inner_scope",
			"swc minifier: fixture/issues/12538/input.js",
			"swc minifier: fixture/issues/10328/input.js",
			"swc minifier: fixture/issues/10849/input.js",
			"swc minifier: fixture/issues/11007/input.js",
			"swc minifier: fixture/issues/11083/input.js",
			"swc minifier: fixture/issues/11102/input.js",
			"swc minifier: fixture/issues/11103/input.js",
			"swc minifier: fixture/issues/11158/input.js",
			"swc minifier: fixture/issues/11303/input.js",
			"swc minifier: fixture/issues/11512-simple/input.js",
			"swc minifier: fixture/issues/11684/identifier-preserved/input.js",
			"swc minifier: fixture/issues/11684/preserved/input.js",
			"swc minifier: fixture/issues/11755/input.js",
			"swc minifier: fixture/issues/11977/input.js",
			"swc minifier: fixture/issues/11983/input.js",
			"swc minifier: fixture/issues/12032/input.js",
			"swc minifier: fixture/issues/12177/input.js",
			"swc minifier: fixture/issues/12206/hoist-var-from-retained-test/input.js",
			"swc minifier: fixture/issues/12222/input.js",
			"swc minifier: fixture/issues/12298/input.js",
			"swc minifier: fixture/issues/12311/input.js",
			"swc minifier: fixture/issues/12404/input.js",
			"swc minifier: fixture/issues/12492/input.js",
			"swc minifier: fixture/issues/12545/iife_rest_escape_array/input.js",
			"swc minifier: fixture/issues/2011/actual/input.js",
			"swc minifier: fixture/issues/2558/1/input.js",
			"swc minifier: fixture/issues/7004/input.js",
			"swc minifier: fixture/issues/7241/input.js",
			"swc minifier: fixture/issues/7287/1/input.js",
			"swc minifier: fixture/issues/7331/1/input.js",
			"swc minifier: fixture/issues/7331/2/input.js",
			"swc minifier: fixture/issues/7575/1/input.js",
			"swc minifier: fixture/issues/7784/1/input.js",
			"swc minifier: fixture/issues/7784/2/input.js",
			"swc minifier: fixture/issues/8173/input.js",
			"swc minifier: fixture/issues/8718/3/input.js",
			"swc minifier: fixture/issues/8718/4/input.js",
			"swc minifier: fixture/issues/8806/input.js",
			"swc minifier: fixture/issues/8841/input.js",
			"swc minifier: fixture/issues/8844/input.js",
			"swc minifier: fixture/issues/8919/input.js",
			"swc minifier: fixture/issues/8953/input.js",
			"swc minifier: fixture/issues/9628/input.js",
			"swc minifier: fixture/issues/9756/input.js",
			"swc minifier: fixture/issues/d3-time-format/3/input.js",
			"swc minifier: fixture/issues/emotion/react/1/input.js",
			"swc minifier: fixture/issues/emotion/react/2/input.js",
			"swc minifier: fixture/issues/firebase-core/1/input.js",
			"swc minifier: fixture/issues/firebase-firestore/1/input.js",
			"swc minifier: fixture/issues/firebase/dist/1/input.js",
			"swc minifier: fixture/issues/quagga2/1.4.2/1/input.js",
			"swc minifier: fixture/issues/react-autosuggest/1/input.js",
			"swc minifier: fixture/issues/react-autowhatever/1/input.js",
			"swc minifier: fixture/issues/react-countup/1/input.js",
			"swc minifier: fixture/issues/react-instancesearch/002/input.js",
			"swc minifier: fixture/issues/react-instancesearch/003/input.js",
			"swc minifier: fixture/issues/react-instancesearch/004/input.js",
			"swc minifier: fixture/issues/vercel/005/input.js",
			"swc minifier: fixture/next/33458/static/chunks/pages/spread-be872e60d968a0f7/input.js",
			"swc minifier: fixture/next/46887/input.js",
			"swc minifier: fixture/next/56408/input.js",
			"swc minifier: fixture/next/cryptojs/input.js",
			"swc minifier: fixture/projects/next/.archive-4/266-aee26c928109d49d6151/input.js",
			"swc minifier: fixture/projects/next/.archive-4/pages/development-logs/link-with-no-prefetch-53313deb99cf94686856/input.js",
			"swc minifier: fixture/projects/next/.archive-4/pages/development-logs/link-with-prefetch-false-13db3186d6589f014e19/input.js",
			"swc minifier: fixture/projects/next/.archive-4/polyfills-6437a4964f697e5b0b3e/input.js",
			"swc minifier: fixture/projects/next/archive-2/pages/._app-b4bcb0e52cac90b0d2d8/input.js",
			"swc minifier: fixture/projects/next/archive-2/pages/.development-logs-2ac9e724502f3ba1f1de/input.js",
			"swc minifier: fixture/projects/next/archive-2/pages/.dynamic-098d0d54bd014f190920/input.js",
			"swc minifier: fixture/projects/next/archive-2/pages/.hmr-ce649615cbc9a3b4c1ce/input.js",
			"swc minifier: fixture/projects/next/archive-2/pages/hmr/.counter-c6a48518c4a56e4d9ce5/input.js",
			"swc minifier: fixture/projects/next/archive-2/pages/hmr/.error-in-gip-bd210c03b443f903b86d/input.js",
			"swc minifier: fixture/projects/next/archive-2/pages/hmr/.style-dynamic-component-9a264c0c3df661f65dda/input.js",
			"swc minifier: fixture/projects/next/archive-2/pages/hmr/.style-stateful-component-6cd7bdfa37b75acb9d04/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/chunkfilename-b114cf1d23876beaa712/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/function-7fe8439c89afccb77983/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/head-432fc3a9a66c90ce2ec2/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/multiple-modules-d02ebebcfa5282e50b34/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/nested-05a7ce04b1f7eb6da341/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/no-chunk-e2d9573b8d7df68a6cde/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/no-ssr-9ced90e71a0d75a11cdd/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/no-ssr-custom-loading-7f61b2e27708ca1854e0/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/ssr-994266264fb6ff57d32c/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/ssr-true-6d4aa8fc503b9d073aef/input.js",
			"swc minifier: fixture/projects/react/10/input.js",
			"swc minifier: fixture/projects/react/12/input.js",
			"swc minifier: fixture/projects/react/7/input.js",
			"swc minifier: fixture/projects/wmr/archive-1/chunks/.compat.2f7d9500/input.js",
			"swc minifier: fixture/projects/wmr/archive-1/chunks/prerender.93c6f601/input.js",
			"swc minifier: full/size/39ee86af2a2157bccd42915ff69b6d3abff2b725/input.js",
			"swc minifier: full/size/991835278eecab695ad3515447b5747adcdfe1b4/input.js",
			"swc minifier: full/vercel/ms/1/input.js",
			"swc minifier: projects/files/react-17.0.1.js",
			"swc minifier: projects/files/react-dom-17.0.2.js",
			"swc minifier: fixture/issues/7568/1/input.js",
			"swc minifier: fixture/issues/pure-callee-call/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `switch` tests cover",
		[
			"terser compress: switch/issue_1663",
			"terser compress: switch/if_else8",
			"terser compress: switch/issue_1679",
			"terser compress: switch/issue_1680_1",
			"terser compress: switch/issue_1690_2",
			"terser compress: switch/issue_1083_3",
			"terser compress: switch/issue_1083_4",
			"swc minifier: fixture/issues/11970/input.js"
		]
	],
	[
		"swc writes a variable's value at its one read and drops the variable, an alias of another binding or an assignment folded into its next read included",
		[
			"swc minifier: fixture/issues/7402/input.js",
			"swc minifier: fixture/issues/7500/input.js",
			"swc minifier: fixture/issues/react-countup/2/input.js",
			"swc minifier: fixture/pr/11446/input.js",
			"swc minifier: fixture/projects/yui/11/input.js",
			"terser compress: classes/class_duplication_2",
			"terser compress: collapse_vars/collapse_vars_array",
			"terser compress: collapse_vars/var_defs",
			"terser compress: dead-code/issue_2233_2",
			"terser compress: drop-unused/cascade_drop_assign",
			"terser compress: drop-unused/issue_2768",
			"terser compress: drop-unused/issue_t161_top_retain_10",
			"terser compress: drop-unused/issue_t161_top_retain_13",
			"terser compress: functions/duplicate_argnames",
			"terser compress: functions/issue_2601_1",
			"terser compress: functions/issue_2620_2",
			"terser compress: functions/issue_2663_1",
			"terser compress: functions/issue_2663_3",
			"terser compress: harmony/issue_2874_3",
			"terser compress: hoist_props/issue_851_hoist_to_conflicting_name",
			"terser compress: hoist_props/name_collision_2",
			"terser compress: hoist_props/name_collision_3",
			"terser compress: issue-1639/issue_1639_3",
			"terser compress: issue-t120/issue_t120_1",
			"terser compress: issue-t120/issue_t120_2",
			"terser compress: loops/dead_code_condition",
			"terser compress: pure_getters/issue_2265_2",
			"terser compress: pure_getters/set_immutable_2",
			"terser compress: pure_getters/set_immutable_4",
			"terser compress: reduce_vars/regex_loop",
			"terser compress: sequences/lift_sequences_2",
			"terser compress: sequences/lift_sequences_5",
			"terser compress: sequences/lift_sequences_6",
			"swc minifier: fixture/issues/10630/input.js",
			"swc minifier: fixture/issues/10807/input.js",
			"swc minifier: fixture/issues/12190/input.js",
			"swc minifier: fixture/issues/12380/input.js",
			"swc minifier: fixture/issues/5280/input.js",
			"swc minifier: fixture/issues/5693/input.js",
			"swc minifier: fixture/issues/6492/1/input.js",
			"swc minifier: fixture/issues/6492/2/input.js",
			"swc minifier: fixture/issues/6492/3/input.js",
			"swc minifier: fixture/issues/6492/4/input.js",
			"swc minifier: fixture/issues/7739/1/input.js",
			"swc minifier: fixture/issues/7847/input.js",
			"swc minifier: fixture/issues/8718/2/input.js",
			"swc minifier: fixture/issues/8718/5/input.js",
			"swc minifier: fixture/issues/8718/6/input.js",
			"swc minifier: fixture/issues/issue-2604/1/input.js",
			"swc minifier: fixture/issues/vercel/004/input.js",
			"swc minifier: fixture/next/66237/input.js",
			"swc minifier: fixture/projects/backbone/9/input.js",
			"swc minifier: fixture/projects/next/extra/if_return/.3/input.js",
			"swc minifier: fixture/projects/wmr/archive-1/chunks/index.ddc4110d/input.js",
			"swc minifier: full/size/6d52ebcc72a64f1f1ef2594baecb5dcab49b1a32/input.js",
			"swc minifier: fixture/issues/10816/input.js",
			"swc minifier: fixture/issues/12118/export/input.js",
			"swc minifier: fixture/issues/12118/input.js",
			"swc minifier: fixture/issues/2614/1/input.js",
			"swc minifier: fixture/issues/6422/1/input.js",
			"swc minifier: fixture/issues/6864/input.js",
			"swc minifier: fixture/issues/8718/7/input.js",
			"swc minifier: fixture/issues/8924/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `drop-unused` tests cover",
		[
			"terser compress: drop-unused/unused_funarg_1",
			"terser compress: drop-unused/unused_funarg_2",
			"terser compress: drop-unused/drop_fargs",
			"terser compress: drop-unused/iife",
			"terser compress: drop-unused/issue_1656",
			"terser compress: drop-unused/issue_2136_2",
			"terser compress: drop-unused/issue_2136_3",
			"terser compress: drop-unused/issue_t161_top_retain_1",
			"terser compress: drop-unused/issue_t161_top_retain_3",
			"terser compress: drop-unused/issue_t161_top_retain_4",
			"terser compress: drop-unused/issue_t161_top_retain_6",
			"terser compress: drop-unused/issue_t161_top_retain_8",
			"terser compress: drop-unused/issue_t161_top_retain_9",
			"terser compress: drop-unused/issue_t161_top_retain_11",
			"terser compress: drop-unused/issue_t161_top_retain_14"
		]
	],
	[
		"swc goes further than webpack on what terser's `collapse_vars` tests cover",
		[
			"terser compress: collapse_vars/collapse_vars_issue_721",
			"terser compress: collapse_vars/collapse_vars_seq",
			"terser compress: collapse_vars/collapse_vars_throw",
			"terser compress: collapse_vars/collapse_vars_assignment",
			"terser compress: collapse_vars/collapse_vars_lvalues_drop_assign",
			"terser compress: collapse_vars/collapse_vars_closures",
			"terser compress: collapse_vars/issue_1631_1",
			"terser compress: collapse_vars/conditional_1",
			"terser compress: collapse_vars/issue_2436_4",
			"terser compress: collapse_vars/issue_2436_8",
			"terser compress: collapse_vars/issue_2436_14",
			"terser compress: collapse_vars/cascade_conditional",
			"terser compress: collapse_vars/cascade_call",
			"terser compress: collapse_vars/cascade_forin",
			"terser compress: collapse_vars/unsafe_builtin"
		]
	],
	[
		"swc goes further than webpack on what swc's `fixture/next` tests cover",
		[
			"swc minifier: fixture/next/target-es2015/static/chunks/main-04b5934c26266542/input.js",
			"swc minifier: fixture/next/33265/static/chunks/d6e1aeb5-38a8d7ae57119c23/input.js",
			"swc minifier: fixture/next/33265/static/chunks/pages/index-cb36c1bf7f830e3c/input.js",
			"swc minifier: fixture/next/43208/static/chunks/pages/index-e1d69965f0f167c9/input.js",
			"swc minifier: fixture/next/46887-2/input.js",
			"swc minifier: fixture/next/54192/1/input.js",
			"swc minifier: fixture/next/66378/input.js",
			"swc minifier: fixture/next/chakra/input.js",
			"swc minifier: fixture/next/feedback-1/reduced/1/input.js",
			"swc minifier: fixture/next/feedback-3/579-dcac359116b2707c/input.js",
			"swc minifier: fixture/next/joda/input.js",
			"swc minifier: fixture/next/octokit/static/chunks/357-72bd409f1472b1b8/input.js",
			"swc minifier: fixture/next/styled-components/1/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `evaluate` tests cover",
		[
			"terser compress: evaluate/prop_function",
			"terser compress: evaluate/unsafe_array",
			"terser compress: evaluate/unsafe_array_bad_index",
			"terser compress: evaluate/unsafe_string_bad_index",
			"terser compress: evaluate/in_boolean_context",
			"terser compress: evaluate/delete_expr_1",
			"terser compress: evaluate/delete_expr_2",
			"terser compress: evaluate/delete_binary_1",
			"terser compress: evaluate/delete_binary_2",
			"terser compress: evaluate/issue_1964_2",
			"terser compress: evaluate/array_slice_index",
			"terser compress: evaluate/issue_2231_3",
			"terser compress: evaluate/string_case",
			"terser compress: evaluate/issue_2919",
			"terser compress: evaluate/issue_2926_2"
		]
	],
	[
		"swc goes further than webpack on what terser's `functions` tests cover",
		[
			"terser compress: functions/iifes_returning_constants_keep_fargs_true",
			"terser compress: functions/iifes_returning_constants_keep_fargs_false",
			"terser compress: functions/issue_1841_1",
			"terser compress: functions/function_returning_constant_literal",
			"terser compress: functions/issue_2097",
			"terser compress: functions/inline_loop_2",
			"terser compress: functions/issue_2604_2",
			"terser compress: functions/issue_2630_1",
			"terser compress: functions/recursive_inline_2",
			"terser compress: functions/use_before_init_in_loop",
			"terser compress: functions/drop_lone_use_strict_arrows_2"
		]
	],
	[
		"swc drops or moves an operation converting a value that may be an object or a symbol, which runs its `valueOf` or `toString` or throws, as oxc keeps it",
		[
			"swc minifier: fixture/issues/5680/input.js",
			"swc minifier: fixture/issues/vercel/007/input.js",
			"swc minifier: fixture/next/outstatic/1/input.js",
			"terser compress: collapse_vars/conditional_2",
			"terser compress: collapse_vars/issue_2364_5",
			"terser compress: dead-code/dead_code_constant_boolean_should_warn_more",
			"terser compress: dead-code/dead_code_constant_boolean_should_warn_more_strict",
			"terser compress: drop-unused/global_var",
			"terser compress: drop-unused/issue_2226_1",
			"terser compress: pure_funcs/arithmetic",
			"terser compress: pure_funcs/array",
			"terser compress: sequences/side_effects_cascade_3",
			"terser compress: typeof/typeof_in_boolean_context"
		]
	],
	[
		"swc goes further than webpack on what terser's `conditionals` tests cover",
		[
			"terser compress: conditionals/ifs_1",
			"terser compress: conditionals/ifs_2",
			"terser compress: conditionals/cond_2",
			"terser compress: conditionals/cond_4",
			"terser compress: conditionals/cond_5",
			"terser compress: conditionals/cond_7",
			"terser compress: conditionals/cond_8",
			"terser compress: conditionals/cond_8b",
			"terser compress: conditionals/delete_conditional_1",
			"terser compress: conditionals/delete_conditional_2",
			"terser compress: conditionals/issue_2535_1",
			"terser compress: conditionals/issue_2560"
		]
	],
	[
		"swc goes further than webpack on what terser's `destructuring` tests cover",
		[
			"terser compress: destructuring/destructuring_with_undefined_as_default_assignment",
			"terser compress: destructuring/unused_destructuring_decl_1",
			"terser compress: destructuring/unused_destructuring_decl_5",
			"terser compress: destructuring/unused_destructuring_function_param",
			"terser compress: destructuring/unused_destructuring_object_method_param",
			"terser compress: destructuring/unused_destructuring_class_method_param",
			"terser compress: destructuring/export_function_containing_destructuring_decl",
			"terser compress: destructuring/unused_destructuring_declaration_complex_1",
			"terser compress: destructuring/unused_destructuring_multipass",
			"terser compress: destructuring/empty_object_destructuring_3",
			"terser compress: destructuring/empty_object_destructuring_4",
			"terser compress: destructuring/empty_object_destructuring_misc",
			"terser compress: destructuring/destructure_empty_array_3"
		]
	],
	[
		"swc goes further than webpack on what terser's `loops` tests cover",
		[
			"terser compress: loops/drop_if_break_4",
			"terser compress: loops/drop_if_else_break_4",
			"terser compress: loops/issue_1648",
			"terser compress: loops/issue_2740_1"
		]
	],
	[
		"swc goes further than webpack on what terser's `template-string` tests cover",
		[
			"terser compress: template-string/escape_dollar_curly",
			"terser compress: template-string/sequence_2",
			"terser compress: template-string/template_literal_plus",
			"terser compress: template-string/coerce_to_string"
		]
	],
	[
		"swc goes further than webpack on what swc's `pass-1` tests cover",
		[
			"swc minifier: pass-1/1/input.js",
			"swc minifier: pass-1/3/input.js",
			"swc minifier: pass-1/7/input.js",
			"swc minifier: pass-1/8/input.js",
			"swc minifier: pass-1/issue-6788/1/input.js"
		]
	],
	[
		"swc restructures conditionals: an `if` as `&&` or `?:`, a shared tail or call factored out, `continue` and `break` folded into the condition",
		[
			"swc minifier: fixture/issues/10986/input.js",
			"swc minifier: fixture/issues/11829/input.js",
			"swc minifier: fixture/issues/2926/1/input.js",
			"swc minifier: fixture/issues/5846/input.js",
			"swc minifier: fixture/issues/7412/input.js",
			"swc minifier: fixture/issues/7784/3/input.js",
			"swc minifier: fixture/issues/7984/input.js",
			"swc minifier: fixture/projects/angular/5/input.js",
			"swc minifier: fixture/projects/backbone/13/input.js",
			"swc minifier: fixture/projects/backbone/17/input.js",
			"swc minifier: fixture/projects/backbone/20/input.js",
			"swc minifier: fixture/projects/backbone/3/input.js",
			"swc minifier: fixture/projects/backbone/5/input.js",
			"swc minifier: fixture/projects/jquery/.17/input.js",
			"swc minifier: fixture/projects/jquery/10/input.js",
			"swc minifier: fixture/projects/jquery/12/input.js",
			"swc minifier: fixture/projects/jquery/15/input.js",
			"swc minifier: fixture/projects/jquery/18/input.js",
			"swc minifier: fixture/projects/jquery/21/input.js",
			"swc minifier: fixture/projects/jquery/23/input.js",
			"swc minifier: fixture/projects/jquery/24/input.js",
			"swc minifier: fixture/projects/jquery/27/input.js",
			"swc minifier: fixture/projects/jquery/28/input.js",
			"swc minifier: fixture/projects/jquery/4/input.js",
			"swc minifier: fixture/projects/mootools/10/input.js",
			"swc minifier: fixture/projects/mootools/8/input.js",
			"swc minifier: fixture/projects/next/extra/if_return/1/input.js",
			"swc minifier: fixture/projects/react/.6/input.js",
			"swc minifier: fixture/projects/underscore/16/input.js",
			"swc minifier: fixture/projects/underscore/17/input.js",
			"swc minifier: fixture/projects/underscore/20/input.js",
			"swc minifier: fixture/projects/underscore/23/input.js",
			"swc minifier: fixture/projects/underscore/8/input.js",
			"swc minifier: fixture/projects/underscore/9/input.js",
			"swc minifier: fixture/projects/yui/10/input.js",
			"swc minifier: fixture/projects/yui/13/input.js",
			"swc minifier: fixture/projects/yui/14/input.js",
			"swc minifier: fixture/projects/yui/8/input.js",
			"terser compress: issue-640/cond_5",
			"terser compress: issue-640/conditional",
			"swc minifier: fixture/projects/backbone/14/input.js",
			"swc minifier: fixture/projects/jquery/2/input.js",
			"swc minifier: fixture/issues/7472/1/input.js",
			"swc minifier: fixture/projects/backbone/2/input.js"
		]
	],
	[
		"swc goes further than webpack on what swc's `fixture/simple` tests cover",
		[
			"swc minifier: fixture/simple/if/var/input.js",
			"swc minifier: fixture/simple/inline/4/input.js",
			"swc minifier: fixture/simple/inline/6/input.js",
			"swc minifier: fixture/simple/switch/const/call/input.js",
			"swc minifier: fixture/simple/switch/const/order/input.js",
			"swc minifier: fixture/simple/switch/merge/simple/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `hoist_props` tests cover",
		[
			"terser compress: hoist_props/issue_2377_2",
			"terser compress: hoist_props/issue_2377_3",
			"terser compress: hoist_props/issue_2508_1",
			"terser compress: hoist_props/issue_2508_2",
			"terser compress: hoist_props/issue_2508_5",
			"terser compress: hoist_props/issue_2508_6",
			"terser compress: hoist_props/issue_2519"
		]
	],
	[
		"swc goes further than webpack on what terser's `identity` tests cover",
		[
			"terser compress: identity/inline_identity",
			"terser compress: identity/inline_identity_function",
			"terser compress: identity/inline_identity_undefined",
			"terser compress: identity/inline_identity_extra_params",
			"terser compress: identity/inline_identity_inline_function",
			"terser compress: identity/inline_identity_duplicate_arg_var",
			"terser compress: identity/inline_identity_inner_ref",
			"terser compress: identity/inline_identity_async"
		]
	],
	[
		"swc goes further than webpack on what terser's `labels` tests cover",
		[
			"terser compress: labels/labels_1",
			"terser compress: labels/labels_2",
			"terser compress: labels/labels_3",
			"terser compress: labels/labels_4",
			"terser compress: labels/labels_5"
		]
	],
	[
		"swc goes further than webpack on what terser's `object` tests cover",
		[
			"terser compress: object/prop_arrows_to_concise_method_various",
			"terser compress: object/computed_property_names_side_effects",
			"terser compress: object/prop_arrow_to_concise_method",
			"terser compress: object/concise_method_to_prop_arrow"
		]
	],
	[
		"swc evaluates reads on literals at build time: an index into an array or string, a missing property as `void 0`, `typeof` a class, `delete` of a binding",
		[
			"swc minifier: fixture/member_expr/array_side_effects/input.js",
			"swc minifier: fixture/member_expr/object_side_effects/input.js",
			"terser compress: collapse_vars/collapse_vars_unary",
			"terser compress: collapse_vars/reduce_vars_assign",
			"terser compress: comparing/issue_2857_6",
			"terser compress: typeof/issue_2728_3",
			"swc minifier: fixture/issues/12224/input.js",
			"swc minifier: fixture/issues/9453/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `dead-code` tests cover",
		[
			"terser compress: dead-code/issue_2383_3",
			"terser compress: dead-code/try_catch_finally",
			"terser compress: dead-code/collapse_vars_assignment",
			"terser compress: dead-code/throw_assignment"
		]
	],
	[
		"swc goes further than webpack on what terser's `issue-281` tests cover",
		[
			"terser compress: issue-281/safe_undefined",
			"terser compress: issue-281/issue_1254_negate_iife_nested",
			"terser compress: issue-281/issue_1288_side_effects",
			"terser compress: issue-281/wrap_iife_in_return_call"
		]
	],
	[
		"swc goes further than webpack on what terser's `sequences` tests cover",
		[
			"terser compress: sequences/delete_seq_1",
			"terser compress: sequences/delete_seq_2",
			"terser compress: sequences/delete_seq_3",
			"terser compress: sequences/cascade_assignment_in_return"
		]
	],
	[
		"swc evaluates a built-in called on literals at build time (`toFixed`, `Object.keys`, `[…].join`, `String.fromCharCode`, `Math.*`, string methods), which terser leaves to run time",
		[
			"swc minifier: pass-1/compute/1/input.js",
			"swc minifier: pass-default/compute/1/input.js",
			"terser compress: evaluate/issue_2207_1",
			"terser compress: issue-597/beautify_off_1",
			"terser compress: issue-597/beautify_on_1",
			"swc minifier: fixture/issues/12196/input.js"
		]
	],
	[
		"swc splits a constant object into a variable per property, or reads a property or method straight off the literal, where terser keeps the object",
		[
			"swc minifier: fixture/issues/12182/hoist-props/input.js",
			"swc minifier: fixture/issues/12182/receiver-sensitive/input.js",
			"swc minifier: fixture/issues/9610-methods/input.js",
			"swc minifier: fixture/member_expr/callee/input.js",
			"terser compress: hoist_props/direct_access_2",
			"swc minifier: fixture/issues/10721/input.js",
			"swc minifier: fixture/issues/12208/non-optional-continuation/input.js",
			"swc minifier: fixture/issues/12215/input.js",
			"swc minifier: fixture/issues/8737/2/input.js",
			"swc minifier: fixture/issues/8737/input.js",
			"swc minifier: fixture/issues/9030/input.js",
			"swc minifier: fixture/projects/wmr/archive-1/chunks/index.bf24abaa/input.js"
		]
	],
	[
		"swc follows a variable's value through its reassignments and folds the result to a constant",
		[
			"terser compress: collapse_vars/issue_2313_2",
			"terser compress: dead-code/issue_2860_1",
			"terser compress: reduce_vars/issue_1670_1",
			"terser compress: reduce_vars/issue_1670_3",
			"terser compress: reduce_vars/issue_2860_1",
			"terser compress: reduce_vars/redefine_farg_2"
		]
	],
	[
		'swc picks shorter spellings for comparisons and coercions: `"u">typeof x`, `null==x`, `==` between operands of one type, `!!x` for `Boolean(x)`, no `|0` on an int32',
		[
			"swc minifier: fixture/issues/10281/input.js",
			"swc minifier: fixture/issues/12186/nested-bitwise/input.js",
			"swc minifier: fixture/issues/12186/signed-shift/input.js",
			"swc minifier: fixture/issues/12307/input.js",
			"terser compress: collapse_vars/collapse_vars_properties",
			"terser compress: pure_funcs/assign",
			"swc minifier: fixture/issues/11108/input.js",
			"swc minifier: fixture/issues/2028/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `arrow` tests cover",
		[
			"terser compress: arrow/async_identifiers",
			"terser compress: arrow/issue_27",
			"terser compress: arrow/issue_2136_2",
			"terser compress: arrow/issue_2136_3",
			"terser compress: arrow/concise_methods_with_computed_property2",
			"terser compress: arrow/async_object_literal"
		]
	],
	[
		"swc goes further than webpack on what terser's `export` tests cover",
		[
			"terser compress: export/async_func",
			"terser compress: export/issue_2134_1",
			"terser compress: export/issue_2134_2"
		]
	],
	[
		"swc goes further than webpack on what terser's `pure_funcs` tests cover",
		[
			"terser compress: pure_funcs/unused",
			"terser compress: pure_funcs/issue_2705_1",
			"terser compress: pure_funcs/issue_2705_6",
			"terser compress: pure_funcs/issue_3065_3",
			"terser compress: pure_funcs/issue_3065_4",
			"terser compress: pure_funcs/side_effects"
		]
	],
	[
		"inlining: a function, a call in place or a single-use value written where it is used by one side and kept apart by the other",
		[
			"swc minifier: fixture/issues/6279/1/input.js",
			"swc minifier: fixture/issues/6279/2/input.js",
			"swc minifier: fixture/projects/next/.archive-4/main-2953d6142ff4a439dbc0/input.js",
			"terser compress: functions/loop_init_arg",
			"terser compress: inline/issue_308",
			"swc minifier: fixture/issues/9610/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `harmony` tests cover",
		[
			"terser compress: harmony/object_spread_unsafe",
			"terser compress: harmony/array_literal_with_spread_3a",
			"terser compress: harmony/issue_2794_3"
		]
	],
	[
		"swc resolves a `switch` on a known value at build time, and writes a one-case `switch` as an `if`",
		[
			"swc minifier: fixture/issues/9619/input.js",
			"terser compress: issue-1750/case_2",
			"terser compress: switch/issue_441_1",
			"terser compress: switch/issue_441_2",
			"swc minifier: fixture/issues/12206/keep-trailing-test-after-default/input.js",
			"swc minifier: fixture/issues/12206/skip-removed-test-after-dynamic-match/input.js",
			"swc minifier: fixture/issues/4412/input.js",
			"swc minifier: fixture/issues/9922/1/input.js",
			"swc minifier: fixture/issues/9922/2/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `properties` tests cover",
		[
			"terser compress: properties/evaluate_array_length",
			"terser compress: properties/evaluate_string_length",
			"terser compress: properties/lhs_prop_2"
		]
	],
	[
		"swc goes further than webpack on what terser's `pure_getters` tests cover",
		[
			"terser compress: pure_getters/issue_2313_3",
			"terser compress: pure_getters/issue_2313_4",
			"terser compress: pure_getters/issue_2313_7"
		]
	],
	[
		"swc goes further than webpack on what swc's `fixture/terser` tests cover",
		[
			"swc minifier: fixture/terser/issue-2435-1/1/input.js",
			"swc minifier: fixture/terser/issue-2435-1/3/input.js",
			"swc minifier: fixture/terser/issue-2435-1/4/input.js",
			"swc minifier: fixture/terser/issue-2535-2/3/input.js"
		]
	],
	[
		"boolean and conditional forms: `!a&&b` vs `a?!1:b`, `!!a` vs `a&&!0`, `x||void 0` vs `if(x)`, an `if` with or without braces, a test's branches swapped",
		[
			"terser compress: conditionals/ternary_boolean_consequent",
			"swc minifier: fixture/projects/react/13/input.js",
			"terser compress: conditionals/ternary_boolean_alternative",
			"swc minifier: fixture/issues/12565/if_plain_cons/input.js",
			"swc minifier: fixture/projects/backbone/4/input.js"
		]
	],
	[
		'swc folds arithmetic and concatenation of literals (`"1"+"2"`, `1+""`, `5+3`) that terser leaves as written',
		[
			"terser compress: dead-code/collapse_vars_misc1",
			"swc minifier: fixture/issues/8706/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `arrays` tests cover",
		["terser compress: arrays/length"]
	],
	[
		"swc goes further than webpack on what terser's `issue-t50` tests cover",
		[
			"terser compress: issue-t50/issue_t50",
			"terser compress: issue-t50/issue_t50_let",
			"terser compress: issue-t50/issue_t50_const"
		]
	],
	[
		"swc goes further than webpack on what terser's `transform` tests cover",
		[
			"terser compress: transform/booleans_evaluate",
			"terser compress: transform/while_if_break"
		]
	],
	[
		"swc goes further than webpack on what swc's `fixture/reduced` tests cover",
		["swc minifier: fixture/reduced/2/input.js"]
	],
	[
		"where a declaration goes: a `let`, `var` or function declaration placed earlier or later, or its first value assigned apart",
		[
			"swc minifier: fixture/issues/12192/input.js",
			"swc minifier: fixture/projects/mootools/7/input.js",
			"swc minifier: fixture/projects/yui/7/input.js"
		]
	],
	[
		"mangled-name choice: the same program with other mangled names, or one name given to other bindings",
		[
			"swc minifier: fixture/projects/react/9/input.js",
			"swc minifier: fixture/issues/9650/input.js",
			"swc minifier: fixture/issues/10041/input.js",
			"swc minifier: fixture/issues/12545/fn_rest_loop/input.js",
			"swc minifier: fixture/issues/4386/2/input.js",
			"swc minifier: fixture/issues/9504/input.js",
			"swc minifier: fixture/issues/moment/1/input.js",
			"swc minifier: fixture/issues/object-accessor-function-boundary/input.js",
			"swc minifier: fixture/issues/vercel/006/input.js",
			"swc minifier: fixture/next/31077/static/chunks/1606726a.10299989c08cb523/input.js",
			"swc minifier: fixture/projects/jquery/1/input.js",
			"swc minifier: fixture/projects/jquery/25/input.js",
			"swc minifier: fixture/projects/mootools/6/input.js",
			"swc minifier: projects/files/jquery-1.9.1.js"
		]
	],
	[
		"swc drops what nothing reads or what has no effect: unused variables and destructuring, side-effect-free `new Map()` and pure calls, an empty constructor",
		[
			"swc minifier: fixture/simple/sequences/.0001/input.js",
			"swc minifier: pass-1/joda/2/input.js",
			"swc minifier: fixture/issues/12566/defaults/input.js",
			"swc minifier: fixture/issues/12566/without-reduce-vars/input.js",
			"swc minifier: fixture/issues/10178/input.js",
			"swc minifier: fixture/issues/10425/input.js",
			"swc minifier: fixture/issues/10981/input.js",
			"swc minifier: fixture/issues/11684/identifier-side-effects/input.js",
			"swc minifier: fixture/issues/11684/side-effects/input.js",
			"swc minifier: fixture/issues/11730/input.js",
			"swc minifier: fixture/issues/11730_class_expr/input.js",
			"swc minifier: fixture/issues/12204/empty-controls/input.js",
			"swc minifier: fixture/issues/12204/nullish-arguments/input.js",
			"swc minifier: fixture/issues/12212/safe-unused-rest/input.js",
			"swc minifier: fixture/issues/12218/leading-argument/input.js",
			"swc minifier: fixture/issues/5343/input.js",
			"swc minifier: fixture/issues/8626/input.js",
			"swc minifier: fixture/issues/8670/input.js",
			"swc minifier: fixture/issues/9460/partial-used-default/input.js",
			"swc minifier: fixture/issues/9741_global_objects/input.js",
			"swc minifier: fixture/projects/jquery/5/input.js"
		]
	],
	[
		"swc writes `const` as `let`, a byte shorter and mergeable with its neighbors, and moves leading `var`s into a later declaration",
		["terser compress: dead-code/dead_code_const_declaration"]
	],
	[
		"swc goes further than webpack on what terser's `block-scope` tests cover",
		["terser compress: block-scope/issue_334"]
	],
	[
		"swc goes further than webpack on what terser's `global_defs` tests cover",
		[
			"terser compress: global_defs/issue_2167",
			"terser compress: global_defs/conditional_chains"
		]
	],
	[
		"swc goes further than webpack on what terser's `if_return` tests cover",
		["terser compress: if_return/if_return_6"]
	],
	[
		"swc goes further than webpack on what terser's `issue-1639` tests cover",
		["terser compress: issue-1639/issue_1639_1"]
	],
	[
		"swc goes further than webpack on what terser's `issue-2001` tests cover",
		[
			"terser compress: issue-2001/export_mangle_3",
			"terser compress: issue-2001/export_mangle_4"
		]
	],
	[
		"swc goes further than webpack on what terser's `issue-269` tests cover",
		[
			"terser compress: issue-269/issue_269_1",
			"terser compress: issue-269/strings_concat"
		]
	],
	[
		"swc goes further than webpack on what swc's `fixture/member_expr` tests cover",
		[
			"swc minifier: fixture/member_expr/seq/input.js",
			"swc minifier: fixture/member_expr/undetermined_prop/input.js"
		]
	],
	[
		"swc goes further than webpack on what swc's `fixture/object-factory-inline-cost` tests cover",
		[
			"swc minifier: fixture/object-factory-inline-cost/scalar/input.js",
			"swc minifier: fixture/object-factory-inline-cost/single-use/input.js"
		]
	],
	[
		"swc goes further than webpack on what swc's `fixture/pr` tests cover",
		[
			"swc minifier: fixture/pr/6169/1/input.js",
			"swc minifier: fixture/pr/7856/1/input.js"
		]
	],
	[
		"block scoping: a block of `let` declarations kept where the rival flattens it, renaming the names it would shadow, or the reverse",
		["swc minifier: fixture/issues/8813/input.js"]
	],
	[
		"method vs arrow: webpack writes an object's function property as the shorter `a:()=>x` where oxc writes the method `a(){return x}`, or keeps a `function` swc writes as an arrow",
		[
			"swc minifier: fixture/issues/drop-console-es2015/input.js",
			"swc minifier: fixture/issues/8704/input.js",
			"swc minifier: fixture/issues/8705/input.js",
			"swc minifier: full/size/05f3b568bfaa8ece7f1eb857ea288eb8c696fb04/input.js"
		]
	],
	[
		"`if…return` chain vs `?:…void 0`: webpack folds the returns into one `return a?b:c?d:void 0` where the rival keeps `if(a)return b;if(c)return d`",
		["swc minifier: fixture/projects/next/extra/if_return/.4/input.js"]
	],
	[
		"swc merges imports of one module, drops unused specifiers, and folds a declaration into its `export default`",
		[
			"swc minifier: fixture/check/1/input.js",
			"swc minifier: fixture/issues/11257/input.js",
			"swc minifier: fixture/issues/11321/input.js",
			"swc minifier: fixture/issues/12185/input.js",
			"swc minifier: fixture/projects/wmr/archive-1/chunks/class-fields.43d5f69c/input.js"
		]
	],
	[
		"swc's `drop_console` also drops `console.error[\"capture\"](…)`, which throws in the input; terser keeps a call it cannot prove is console's",
		["swc minifier: fixture/issues/drop-console-computed/input.js"]
	],
	[
		"swc's output is wrong: it keeps only `getObject()` of `#value in getObject()`, losing the TypeError a non-object throws",
		["swc minifier: fixture/pr/11814_class_effect_guards/input.js"]
	],
	[
		"swc's output is wrong: dropping unused classes loses the TypeError of extending a non-constructor and the order of key effects",
		["swc minifier: fixture/pr/11814_class_effect_order/input.js"]
	],
	[
		"swc drops `1 instanceof 1`, which throws; only the `1 in 1` before it, throwing first, hides that",
		["terser compress: comparing/dont_change_in_or_instanceof_expressions"]
	],
	[
		"swc's output is wrong: it drops the second `console.log`, printing one line where the input prints two",
		["terser compress: numbers/issue_1710"]
	],
	[
		"swc's output differs: it drops the `(0, function () {})` detaching a default, so the function takes the binding's `.name`",
		["terser compress: parameters/destructuring_arguments_3"]
	],
	[
		"swc's output is wrong: it drops the global assignment `i = typeof 1n`, so `i` is never set",
		["terser compress: typeof/typeof_evaluation"]
	],
	[
		"swc drops an `in` or `instanceof` whose right side it cannot see, which throws where that side is no object and runs a proxy's or `Symbol.hasInstance`'s code",
		["terser compress: pure_funcs/relational"]
	],
	[
		"webpack, as terser, collapses a variable into its one read in a first pass only: from a second pass on, which swc's `passes: 0` asks for, the variable stays",
		["swc minifier: fixture/issues/5910/1/input.js"]
	],
	[
		"webpack reads the global object a function hands back as one a later write may patch a built-in of, so a value stays bound rather than move past a read of `console`, which swc assumes unpatched",
		["swc minifier: fixture/issues/8284/input.js"]
	],
	[
		"webpack keeps a call behind a read of a script's global, which a function of another script the call runs may set; swc moves the call past the read",
		[
			"terser compress: collapse_vars/var_side_effects_1",
			"terser compress: collapse_vars/var_side_effects_2",
			"terser compress: collapse_vars/var_side_effects_3"
		]
	],
	[
		"swc goes further than webpack on what terser's `class-properties` tests cover",
		[
			"terser compress: class-properties/class_expression_properties_side_effects"
		]
	],
	[
		"swc goes further than webpack on what terser's `drop-console` tests cover",
		[
			"terser compress: drop-console/unexpected_side_effects_dropping_console",
			"swc minifier: fixture/issues/2807/1/input.js",
			"swc minifier: fixture/issues/9757/input.js"
		]
	],
	[
		"swc goes further than webpack on what terser's `hoist_vars` tests cover",
		["terser compress: hoist_vars/issue_2295"]
	],
	[
		"swc goes further than webpack on what terser's `inline` tests cover",
		["terser compress: inline/inline_annotation_2"]
	],
	[
		"swc goes further than webpack on what terser's `issue-1275` tests cover",
		["terser compress: issue-1275/string_plus_optimization"]
	],
	[
		"swc goes further than webpack on what terser's `issue-208` tests cover",
		["terser compress: issue-208/mixed"]
	],
	[
		"swc goes further than webpack on what terser's `issue-2719` tests cover",
		["terser compress: issue-2719/warn"]
	],
	[
		"swc goes further than webpack on what terser's `issue-973` tests cover",
		["terser compress: issue-973/this_binding_conditionals"]
	],
	[
		"swc goes further than webpack on what terser's `nullish` tests cover",
		["terser compress: nullish/nullish_coalescing_boolean_context"]
	],
	[
		"swc goes further than webpack on what terser's `regexp` tests cover",
		["terser compress: regexp/regexp_2"]
	],
	[
		"swc goes further than webpack on what terser's `typeof` tests cover",
		["terser compress: typeof/typeof_defun_2"]
	],
	[
		"swc goes further than webpack on what terser's `unsafe_symbols` tests cover",
		["terser compress: unsafe_symbols/unsafe_symbols_2"]
	],
	[
		"swc goes further than webpack on what swc's `fixture/non-finite-number-literals` tests cover",
		["swc minifier: fixture/non-finite-number-literals/input.js"]
	]
];

/** @type {Record<string, string>} */
const SWC_SMALLER = {};
for (const [reason, sources] of SWC_SMALLER_BY_REASON) {
	for (const source of sources) SWC_SMALLER[source] = reason;
}

module.exports = SWC_SMALLER;
