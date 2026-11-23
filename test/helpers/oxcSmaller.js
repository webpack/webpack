"use strict";

// cspell:ignore argname argnames autowhatever chartjs concattenating constdef cryptojs defun dont elad expname fargs feeback firestore fnames funs hoofd instancesearch joda lvalues mangleprop mangleprops noinline nonmatching outstatic plotly propmangle writeonce

// What oxc's minifier does that webpack's does not yet, each with the sources
// whose output under the default minimizer's options is bigger than oxc's.
// Biggest group first: retire a source once it is no longer bigger.

/** @type {[string, string[]][]} */
const OXC_SMALLER_BY_REASON = [
	[
		"oxc evaluates built-in calls and reads on literals at build time",
		[
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all:8d4a579b",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all:5926825e",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all:3cce8249",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all:924ca433",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all:13e1cbc6",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all:7f69fc60",
			"oxc minifier: peephole/replace_known_methods.rs:test_to_upper:63c4a2f8",
			"oxc minifier: peephole/replace_known_methods.rs:test_to_lower:2fc970c5",
			"oxc minifier: peephole/replace_known_methods.rs:test_to_lower:42cac38a",
			"oxc minifier: peephole/replace_known_methods.rs:test_to_lower:ff9f4d80",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_concat_chaining:c353c716",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_concat_chaining:a3b8a6ac",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_concat_chaining:fa28ffb8",
			"oxc minifier: peephole/replace_known_methods.rs:test_add_template_literal:b5def92d",
			"oxc minifier: peephole/replace_known_methods.rs:test_add_template_literal:e3779472",
			"oxc minifier: peephole/replace_known_methods.rs:test_add_template_literal:926ba769",
			"oxc minifier: peephole/replace_known_methods.rs:string_concat_preserves_coercion_order:afe13551",
			"oxc minifier: peephole/replace_known_methods.rs:string_concat_preserves_coercion_order:0c2bd958",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all_empty_search_utf16:5adcb588",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all_empty_search_utf16:cfb85828",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all_empty_search_utf16:efa535b2",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all_empty_search_utf16:8dd4465c",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_string_replace_all_empty_search_utf16:da69683e",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_concat_chaining:efc18e6d",
			"oxc minifier: peephole/replace_known_methods.rs:string_concat_chains_preserve_call_boundaries:381d0bbf"
		]
	],
	[
		"oxc applies esbuild's shortenings, as oxc's `peephole/esbuild.rs` tests show",
		[
			"oxc minifier: peephole/esbuild.rs:test_flatten_values:d803dae3",
			"oxc minifier: peephole/esbuild.rs:test_flatten_values:06f6d234",
			"oxc minifier: peephole/esbuild.rs:test_remove_dead_expr_other:d7a1df5d",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:1a1f3881",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:a82a1ca6",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:bda41da2",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:b1d060c6",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:4eba2b0a",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:29c061b4",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:2ea0dcd4",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:1ce3c96b",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:7275e313",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:df2f02a8",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:e1237566",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:ea4359cc",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:983905ad",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:e32b3327",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:65503def",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:dcf7e224",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:5e2516e5",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:39a5a487",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:91bc3c40",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:c510d843",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:a6ab8b4f",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:d4e00d4f",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:0e76d903",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:d3fc755c",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:a2a44baa",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:407e35e1",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:553d313c",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:c7bed8bb",
			"oxc minifier: peephole/esbuild.rs:test_remove_dead_expr_nullish_related:07ddcc96",
			"oxc minifier: peephole/esbuild.rs:test_minimize_exit_statements:e5203c2d",
			"oxc minifier: peephole/esbuild.rs:test_minimize_exit_statements:5440968f",
			"oxc minifier: peephole/esbuild.rs:test_minimize_exit_statements:9f7cab5d",
			"oxc minifier: peephole/esbuild.rs:test_minimize_exit_statements:30dc929b",
			"oxc minifier: peephole/esbuild.rs:test_minimize_exit_statements:f040b443",
			"oxc minifier: peephole/esbuild.rs:test_minimize_exit_statements:aabd9f60",
			"oxc minifier: peephole/esbuild.rs:test_minimize_exit_statements:ca2de2ad",
			"oxc minifier: peephole/esbuild.rs:test_minimize_exit_statements:26693540",
			"oxc minifier: peephole/esbuild.rs:test_minimize_exit_statements:76380dab",
			"oxc minifier: peephole/esbuild.rs:test_remove_dead_expr:fd03a3b9",
			"oxc minifier: peephole/esbuild.rs:test_remove_dead_expr:e237026e",
			"oxc minifier: peephole/esbuild.rs:test_remove_dead_expr:00ce97ec",
			"oxc minifier: peephole/esbuild.rs:test_remove_dead_expr:145b43a1",
			"oxc minifier: peephole/esbuild.rs:test_inline_single_use_variable:f8b9d952",
			"oxc minifier: peephole/esbuild.rs:prune_empty_case_before_default:7699a257",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:abbe30c3",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:b462afec"
		]
	],
	[
		"oxc knows more expressions have no side effects and drops them when their value is unused, as oxc's `ecmascript/may_have_side_effects.rs` tests show",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_proxy_sensitive_object_methods:7e4b6bf9",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_throwing_global_calls:2ecf7f15",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_array_expression:2e79a050",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_known_global_identifiers:e7d3799e",
			"oxc minifier: ecmascript/may_have_side_effects.rs:closure_compiler_tests:647ab395",
			"oxc minifier: ecmascript/may_have_side_effects.rs:closure_compiler_tests:6b2ace17",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_binary_expressions:f8f69924",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_binary_expressions:322c59dc",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_array_expression:fb5f8198",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_class_expression:8bf3ec35",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_class_expression:dc49b3e8",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_throwing_global_calls:252e9263",
			"swc minifier: fixture/issues/9460/side-effects/input.js",
			"swc minifier: fixture/issues/12566/defaults/input.js",
			"swc minifier: fixture/issues/12566/without-reduce-vars/input.js",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_new_expressions:86ca76d7"
		]
	],
	[
		"webpack writes the same program in a spelling longer or compressing worse than oxc's",
		[
			"oxc minifier: mangler/property_mangler.rs:99",
			"swc exec: terser_properties_join_object_assignments_undefined_1",
			"swc exec: terser_properties_join_object_assignments_undefined_2",
			"swc minifier: full/size/54531ba076299b43c00a0d234240369f93371a41/input.js",
			"terser compress: reduce_vars/unsafe_evaluate_unknown",
			"terser compress: properties/join_object_assignments_undefined_2",
			"terser compress: properties/join_object_assignments_undefined_1",
			"terser compress: sequences/make_sequences_4",
			"swc minifier: fixture/next/feeback-plotly/1/input.js",
			"swc minifier: fixture/issues/9186/1/input.js",
			"swc minifier: fixture/issues/12213/shadowed-object/input.js",
			"swc minifier: fixture/issues/12191/iterator-errors/input.js",
			"swc minifier: fixture/issues/12191/empty-pattern-iterator/input.js",
			"oxc minifier: peephole/minimize_exit_points.rs:test_try_catch_termination:ed5edc58",
			"terser compress: properties/issue_2208_8",
			"terser compress: object/concise_methods_with_various_property_names",
			"terser compress: object/getter_setter",
			"terser compress: mangleprops-mangleprop-annotation/mangleprop_annotation",
			"terser compress: harmony/export_default_object_expression",
			"terser compress: arrow/issue_3092b",
			"terser compress: arrow/async_object_literal",
			"terser compress: arrow/export_default_object_expression",
			"swc minifier: fixture/issues/murmur2/1/input.js",
			"swc minifier: fixture/issues/11684/bindings/input.js",
			"terser compress: issue-1321/issue_1321_no_debug",
			"terser compress: issue-1321/issue_1321_debug",
			"terser compress: issue-1321/issue_1321_with_quoted",
			"terser compress: properties/join_object_assignments_2",
			"terser compress: properties/join_object_assignments_if",
			"swc exec: terser_properties_join_object_assignments_2",
			"swc exec: terser_issue_1321_issue_1321_no_debug",
			"swc exec: terser_issue_1321_issue_1321_with_quoted",
			"swc exec: terser_issue_1321_issue_1321_debug",
			"oxc minifier: ecmascript/is_int32_or_uint32.rs:binary_tests:058afa31",
			"oxc minifier: ecmascript/is_int32_or_uint32.rs:binary_tests:7bd2777e",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_binary_expressions:05b9c5f0",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_binary_expressions:d5113039",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_binary_expressions:92dd079c",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_binary_expressions:3a822217",
			"oxc minifier: ecmascript/value_type.rs:binary_tests:058afa31",
			"oxc minifier: ecmascript/value_type.rs:binary_tests:7bd2777e",
			"oxc minifier: peephole/minimize_statements.rs:test_for_break_preserves_block_function_scope_in_module:b6a43d73",
			"swc exec: terser_arguments_modified",
			"swc minifier: fixture/issues/10412/input.js",
			"swc minifier: fixture/issues/11684/identifier-preserved/input.js",
			"swc minifier: fixture/issues/arguments-canonical-index/input.js",
			"swc minifier: fixture/projects/jquery/25/input.js",
			"swc minifier: fixture/projects/jquery/27/input.js",
			"swc minifier: fixture/projects/yui/12/input.js",
			"swc minifier: fixture/projects/yui/13/input.js",
			"swc minifier: pass-1/7/input.js",
			"terser compress: asm/asm_mixed",
			"terser compress: collapse_vars/collapse_rhs_conditional_2",
			"terser compress: conditionals/ifs_6",
			"terser compress: evaluate/unsafe_array",
			"terser compress: export/name_cache_import_star_as_name_from_module",
			"terser compress: collapse_vars/collapse_vars_while",
			"terser compress: collapse_vars/cond_branch_2",
			"terser compress: drop-unused/issue_1838",
			"terser compress: export/name_cache_do_not_mangle_export_let_name",
			"terser compress: issue-1656/f7",
			"terser compress: loops/keep_collapse_const_in_own_block_scope_2",
			"terser compress: reduce_vars/variables_collision_in_immediately_invoked_func",
			"terser compress: sequences/make_sequences_2",
			"terser compress: unicode/issue_3271",
			"swc minifier: benches-full/echarts.js",
			"swc minifier: benches-full/moment.js",
			"swc minifier: benches-full/react.js",
			"swc minifier: benches-full/three.js",
			"swc minifier: benches-full/victory.js",
			"swc minifier: benches-full/vue.js",
			"swc minifier: fixture/issues/12189/input.js",
			"swc minifier: fixture/issues/12565/while_body/input.js",
			"swc minifier: fixture/next/66237/input.js",
			"swc minifier: fixture/next/feedback-3/579-dcac359116b2707c/input.js",
			"swc minifier: fixture/next/regression-1/framework-798bab57daac3897/input.js",
			"swc minifier: fixture/next/styled-components/1/input.js",
			"swc minifier: fixture/next/target-es2015/static/chunks/main-04b5934c26266542/input.js",
			"swc minifier: fixture/projects/next/.archive-4/framework-054ead69ea8124b4cb27/input.js",
			"swc minifier: fixture/projects/next/.archive-4/polyfills-6437a4964f697e5b0b3e/input.js",
			"swc minifier: fixture/projects/underscore/16/input.js",
			"swc minifier: fixture/projects/underscore/17/input.js",
			"swc minifier: fixture/projects/underscore/18/input.js",
			"swc exec: terser_collapse_vars_cond_branch_2",
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_legal_comment_when_dce_removes_anchor:f30f12bc",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:b7f227f5",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:1e6acb91",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:9f0ba33c",
			"oxc minifier: peephole/esbuild.rs:js_parser_test:cdcf6c70",
			"oxc minifier: peephole/inline.rs:unmapped_parameters_allow_unused_writes:a2a3e5f1",
			"oxc minifier: peephole/inline.rs:r:e43f16b0",
			"oxc minifier: peephole/inline.rs:r:694471bf",
			"oxc minifier: peephole/minimize_conditions.rs:test_remove_duplicate_statements:6e43bac7",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_while_condition:ee191751",
			"oxc minifier: peephole/minimize_exit_points.rs:test_function_return_optimization:83d430dd",
			"oxc minifier: peephole/minimize_exit_points.rs:test_function_return_optimization:0fdbf8eb",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:d8680617",
			"oxc minifier: peephole/statement_fusion.rs:no_fuse_into_while:cc28643d",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_fold_literal_array_constructors:4a916cd2",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_fold_is_object_and_not_null:bf30ca6e",
			"terser compress: conditionals/cond_9",
			"terser compress: transform/if_return",
			"swc minifier: fixture/issues/7412/input.js",
			"swc minifier: fixture/projects/mootools/.11/input.js",
			"oxc minifier: peephole/remove_dead_code.rs:test_remove_unused_labels:65b22dd2",
			"oxc minifier: peephole/remove_dead_code.rs:test_remove_unused_labels:ce98c659"
		]
	],
	[
		"oxc drops more unused expressions, as oxc's `peephole/remove_unused_expression.rs` tests show",
		[
			"oxc minifier: peephole/remove_unused_expression.rs:test_de_morgan_for_unused_expr:f3a5def8",
			"oxc minifier: peephole/remove_unused_expression.rs:test_de_morgan_for_unused_expr:16fa2395",
			"oxc minifier: peephole/remove_unused_expression.rs:test_de_morgan_for_unused_expr:1c43f55a",
			"oxc minifier: peephole/remove_unused_expression.rs:test_de_morgan_for_unused_expr:3902ec27",
			"oxc minifier: peephole/remove_unused_expression.rs:test_remove_unused_this:2e6ca9e6",
			"oxc minifier: peephole/remove_unused_expression.rs:test_remove_unused_this:1fd47091",
			"oxc minifier: peephole/remove_unused_expression.rs:test_template_literal_drop_walks_removed_element_refs:939506c1",
			"oxc minifier: peephole/remove_unused_expression.rs:test_array_spread_drop_walks_argument_refs:d0ea7ca1",
			"oxc minifier: peephole/remove_unused_expression.rs:test_object_literal:50888659",
			"oxc minifier: peephole/remove_unused_expression.rs:test_fold_binary_expression:d89c7139",
			"oxc minifier: peephole/remove_unused_expression.rs:test_fold_iife:b7551dcf",
			"oxc minifier: peephole/remove_unused_expression.rs:remove_unused_assignment_expression:8afc5079",
			"oxc minifier: peephole/remove_unused_expression.rs:remove_unused_class_expression:466a2c39",
			"oxc minifier: peephole/remove_unused_expression.rs:remove_unused_class_expression:8aac6e9f",
			"oxc minifier: peephole/remove_unused_expression.rs:remove_unused_class_expression:78c9bc9b"
		]
	],
	[
		"real-world code, where no one transform above accounts for half the gap: several cut opposite ways, or the rival restructures the program too far for a token diff to attribute",
		[
			"swc minifier: fixture/issues/emotion/react/2/input.js",
			"swc minifier: fixture/issues/vercel/004/input.js",
			"swc minifier: benches-full/d3.js",
			"swc minifier: benches-full/terser.js"
		]
	],
	[
		"oxc substitutes shorter syntax, as oxc's `peephole/substitute_alternate_syntax.rs` tests show",
		[
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_fold_literal_object_constructors:0450771d",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_fold_literal_object_constructors:6ef0e0fe",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_fold_literal_object_constructors:de00fe20",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_fold_literal_object_constructors:faa2a526",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_remove_unary_plus_evaluation_order:fc21d586",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:optional_catch_binding:77f8dcfe",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_rewrite_arguments_copy_loop:70723a6d",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_rewrite_arguments_copy_loop:3ea05d0a",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_rewrite_arguments_copy_loop:67928fcd",
			"swc minifier: fixture/issues/7749/input.js",
			"swc minifier: fixture/projects/jquery/26/input.js"
		]
	],
	[
		"oxc normalizes the syntax before compressing it, as oxc's `peephole/normalize.rs` tests show",
		[
			"oxc minifier: peephole/normalize.rs:pure_constructors:b1b6b588",
			"oxc minifier: peephole/normalize.rs:pure_constructors:19674926",
			"oxc minifier: peephole/normalize.rs:drop_debugger:11cd868a",
			"oxc minifier: peephole/normalize.rs:drop_debugger:b8c4bfb1",
			"oxc minifier: peephole/normalize.rs:pure_constructors:02f618b9",
			"oxc minifier: peephole/normalize.rs:preserve_legal_comment_above_removed_use_strict:03ea0595",
			"oxc minifier: peephole/normalize.rs:preserve_legal_comment_above_removed_use_strict:174a0bb9",
			"oxc minifier: peephole/normalize.rs:preserve_legal_comment_above_removed_inner_function_use_strict:857ff5b5",
			"oxc minifier: peephole/normalize.rs:builtin_purity_preserves_argument_evaluation:86ca76d7"
		]
	],
	[
		"oxc writes conditions shorter, as oxc's `peephole/minimize_conditions.rs` tests show",
		[
			"oxc minifier: peephole/minimize_conditions.rs:test_dont_remove_duplicate_statements_without_normalization:aba12567",
			"oxc minifier: peephole/minimize_conditions.rs:test_compress_conditional_expression_inside:3cdfe4ac",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:e0e034ee",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:0b32a099",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:f9eee774",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:46c0b98f",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:0c008f2e",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:603d76ad",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:b750eced",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:25299836",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:9c69bd6d",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:803ee121",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:bd27c609",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:83707411",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:a2352bc2",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_one_child_blocks:814e3fca",
			"oxc minifier: peephole/minimize_conditions.rs:test_combine_ifs2:b4250cff",
			"oxc minifier: peephole/minimize_conditions.rs:test_combine_ifs2:09d32deb",
			"oxc minifier: peephole/minimize_conditions.rs:test_not_cond:74417ee6",
			"oxc minifier: peephole/minimize_conditions.rs:test_not_cond:aec2e3ef",
			"oxc minifier: peephole/minimize_conditions.rs:test_not_cond:b935bd2a",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_demorgan_remove_leading_not:1c319fc4",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_demorgan_remove_leading_not:0ced3207",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_demorgan_remove_leading_not:65780d77",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_demorgan1:3d176dbf",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_demorgan3:b95e2095",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_demorgan5:91f8b374",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_demorgan11:4f44734d",
			"oxc minifier: peephole/minimize_conditions.rs:test_dangling_else:28d992b9",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_demorgan21:ac90daa6",
			"oxc minifier: peephole/minimize_conditions.rs:test_minimize_and_or1:e27b69d0",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_loop_break:3d267acf",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_if_with_lower_operators_inside:a14ae815",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_if_with_lower_operators_inside:0ff85c5e",
			"oxc minifier: peephole/minimize_conditions.rs:test_remove_else_cause2:08860a8c",
			"oxc minifier: peephole/minimize_conditions.rs:test_remove_else_cause2:874a2997",
			"oxc minifier: peephole/minimize_conditions.rs:test_remove_else_cause3:15efa855",
			"oxc minifier: peephole/minimize_conditions.rs:test_remove_else_cause3:d5aac136",
			"oxc minifier: peephole/minimize_conditions.rs:test_negate_empty_if_stmt_consequent:874025e2",
			"oxc minifier: peephole/minimize_conditions.rs:test_negate_empty_if_stmt_consequent:e5900512",
			"oxc minifier: peephole/minimize_conditions.rs:test_negate_empty_if_stmt_consequent:e5e8114f",
			"oxc minifier: peephole/minimize_conditions.rs:test_derived_constructor_this_captured_by_arrow:7be56e2e"
		]
	],
	[
		"oxc goes further than webpack on what swc's `exec.rs` tests cover",
		[
			"swc exec: next_feedback_1_capture_1",
			"swc exec: emotion_react_1",
			"swc exec: terser_drop_unused_issue_t161_top_retain_15",
			"swc exec: terser_pure_getters_impure_getter_2",
			"swc exec: terser_destructuring_destructuring_assign_of_computed_key",
			"swc exec: terser_issue_1447_conditional_false_stray_else_in_loop",
			"swc exec: terser_labels_labels_3",
			"swc exec: terser_reduce_vars_side_effects_assign",
			"swc exec: terser_reduce_vars_recursive_inlining_4",
			"swc exec: terser_collapse_vars_cond_branch_1",
			"swc exec: terser_collapse_vars_may_throw_2",
			"swc exec: terser_properties_join_object_assignments_return_2",
			"swc exec: terser_issue_1639_issue_1639_1",
			"swc exec: terser_arrays_for_loop",
			"swc exec: terser_functions_issue_2898",
			"swc exec: terser_functions_issue_2783",
			"swc exec: terser_try_catch_catch_destructuring_with_sequence",
			"swc exec: issue_6903_1",
			"swc exec: issue_6903_2",
			"swc exec: issue_6903_3",
			"swc exec: issue_11517_continue",
			"swc exec: issue_11078_math_constant_folding",
			"swc exec: terser_labels_labels_4"
		]
	],
	[
		"oxc drops a redundant last `return`, `break` or `continue`, as oxc's `peephole/minimize_exit_points.rs` tests show",
		[
			"oxc minifier: peephole/minimize_exit_points.rs:test_while_continue_optimization:16326839",
			"oxc minifier: peephole/minimize_exit_points.rs:test_function_return_optimization:655d338f",
			"oxc minifier: peephole/minimize_exit_points.rs:test_function_return_optimization:1716ec00",
			"oxc minifier: peephole/minimize_exit_points.rs:test_function_return_optimization:ffab34ae",
			"oxc minifier: peephole/minimize_exit_points.rs:test_function_return_optimization:c76f1218",
			"oxc minifier: peephole/minimize_exit_points.rs:test_function_return_optimization:65455001",
			"oxc minifier: peephole/minimize_exit_points.rs:test_function_return_optimization:89835515",
			"oxc minifier: peephole/minimize_exit_points.rs:test_while_continue_optimization:3d67082e",
			"oxc minifier: peephole/minimize_exit_points.rs:test_while_continue_optimization:4ab5032f",
			"oxc minifier: peephole/minimize_exit_points.rs:test_for_continue_optimization:5b763795",
			"oxc minifier: peephole/minimize_exit_points.rs:test_for_continue_optimization:2b375463",
			"oxc minifier: peephole/minimize_exit_points.rs:test_for_continue_optimization:fa7b014e",
			"oxc minifier: peephole/minimize_exit_points.rs:test_for_continue_optimization:34ac02f3",
			"oxc minifier: peephole/minimize_exit_points.rs:test_switch_exit_points1:ebe0a496",
			"oxc minifier: peephole/minimize_exit_points.rs:test_test_block_scoped_variables:bc33072e",
			"oxc minifier: peephole/minimize_exit_points.rs:test_break_optimization:1ba6d27d"
		]
	],
	[
		"oxc drops more unreachable code, as oxc's `peephole/remove_dead_code.rs` tests show",
		[
			"oxc minifier: peephole/remove_dead_code.rs:remove_unused_expressions_in_sequence:20a45768",
			"oxc minifier: peephole/remove_dead_code.rs:test_fold_block:655d338f",
			"oxc minifier: peephole/remove_dead_code.rs:test_remove_no_op_labelled_statement:0b6582b2",
			"oxc minifier: peephole/remove_dead_code.rs:test_fold_useless_for:7a6e18e6",
			"oxc minifier: peephole/remove_dead_code.rs:test_fold_useless_for:166b57e4",
			"oxc minifier: peephole/remove_dead_code.rs:remove_unused_expressions_in_for:5b3fb43b",
			"swc minifier: fixture/issues/12299/input.js",
			"swc minifier: fixture/issues/9619/input.js",
			"oxc minifier: peephole/remove_dead_code.rs:test_remove_unused_labels:097786dc",
			"oxc minifier: peephole/remove_dead_code.rs:test_remove_unused_labels:1e8b08b2",
			"oxc minifier: peephole/remove_dead_code.rs:test_remove_unused_labels:48e1a076",
			"oxc minifier: peephole/remove_dead_code.rs:test_remove_unused_labels:bd15f134",
			"oxc minifier: peephole/remove_dead_code.rs:test_remove_unused_labels:ee9ac22d"
		]
	],
	[
		"oxc drops more dead code, as oxc's `peephole/dead_code_elimination.rs` tests show",
		[
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_legal_comment_when_dce_removes_anchor:5d511617",
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_legal_comment_when_dce_removes_anchor:8f38137a",
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_legal_comment_when_dce_removes_anchor:7c9fc3bb",
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_legal_comment_when_dce_removes_anchor:52e8d3b7",
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_at_license_legal_comment_when_dce_removes_anchor:f77d3c74",
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_at_license_legal_comment_when_dce_removes_anchor:1d03f03f",
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_annotation_comments_when_inlining_single_use_variable:8026e914",
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_annotation_comments_when_inlining_single_use_variable:b3f37918",
			"oxc minifier: peephole/dead_code_elimination.rs:preserve_annotation_comments_when_inlining_single_use_variable:5419038f",
			"oxc minifier: peephole/dead_code_elimination.rs:dce_if_statement:32add5f1",
			"oxc minifier: peephole/dead_code_elimination.rs:dce_if_statement:3c5765e5",
			"oxc minifier: peephole/dead_code_elimination.rs:dce_if_statement:9963460f",
			"oxc minifier: peephole/dead_code_elimination.rs:dce_if_statement:188e170c",
			"oxc minifier: peephole/dead_code_elimination.rs:fold_optional_chain_on_undefined_let_binding:2d581bea",
			"oxc minifier: peephole/dead_code_elimination.rs:fold_optional_chain_on_undefined_let_binding:0c0ecc1b",
			"oxc minifier: peephole/dead_code_elimination.rs:fold_optional_chain_on_undefined_let_binding:7229043b",
			"oxc minifier: peephole/dead_code_elimination.rs:fold_coalesce_on_tracked_non_nullish_binding:0015b511",
			"oxc minifier: peephole/dead_code_elimination.rs:dce_keeps_inferred_class_name_for_executing_class:e77b52b7",
			"oxc minifier: peephole/dead_code_elimination.rs:block_unwrap_needs_no_extra_pass:199cfb09",
			"oxc minifier: peephole/dead_code_elimination.rs:block_unwrap_needs_no_extra_pass:067258dd"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/minimize_conditional_expression.rs` tests cover",
		[
			"oxc minifier: peephole/minimize_conditional_expression.rs:minimize_conditional_exprs:d22ba215",
			"oxc minifier: peephole/minimize_conditional_expression.rs:test_minimize_conditional_numeric:ffb5af88"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/minimize_statements.rs` tests cover",
		[
			"oxc minifier: peephole/minimize_statements.rs:test_for_continue_in_for:dc9c96bc",
			"oxc minifier: peephole/minimize_statements.rs:test_for_continue_in_for:613806a5",
			"oxc minifier: peephole/minimize_statements.rs:test_for_continue_in_for:675440da",
			"oxc minifier: peephole/minimize_statements.rs:test_for_in_block_scoped_no_inline:3b945dbb",
			"oxc minifier: peephole/minimize_statements.rs:test_for_in_block_scoped_no_inline:cfe1e0d2",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:19599956",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:585caa24",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:2384ca92",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:6aea9bef",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:2b9b0f1a",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:5464b165",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:76b7c300",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:22ed18bd",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:14732ddb",
			"oxc minifier: peephole/minimize_statements.rs:test_handle_switch_statement:d019732a",
			"oxc minifier: peephole/minimize_statements.rs:test_inline_single_use_function_declaration:0f3efe27"
		]
	],
	[
		"`,` vs `;` statements: the same statements joined into one sequence where the rival writes them apart, or a sequence's expressions lifted out or kept in another order",
		[
			"terser compress: conditionals/issue_2560",
			"terser compress: evaluate/issue_t790_strings_larger_than_refs",
			"terser compress: evaluate/issue_t790_strings_smaller_than_refs",
			"terser compress: ie8/do_screw_try_catch_undefined",
			"terser compress: ie8/dont_screw_try_catch_undefined",
			"terser compress: reduce_vars/escaped_prop_3",
			"terser compress: reduce_vars/escape_await",
			"swc minifier: fixture/issues/2044/full/input.js",
			"swc minifier: fixture/issues/4386/1/input.js",
			"swc minifier: fixture/issues/4386/2/input.js",
			"swc minifier: fixture/projects/jquery/9/input.js",
			"swc minifier: fixture/projects/next/extra/if_return/2/input.js",
			"swc exec: terser_reduce_vars_escaped_prop_3",
			"swc exec: issues_2011_2",
			"oxc minifier: peephole/remove_unused_expression.rs:test_property_write_side_effects:ef99659c",
			"swc minifier: fixture/issues/2078/1/input.js",
			"swc minifier: fixture/issues/6864/input.js",
			"swc minifier: fixture/projects/jquery/18/input.js",
			"swc minifier: fixture/projects/next/extra/if_return/.4/input.js",
			"terser compress: inline/inline_into_scope_conflict_enclosed",
			"terser compress: yield/yield_before_punctuators"
		]
	],
	[
		"oxc goes further than webpack on what terser's `collapse_vars` tests cover",
		[
			"terser compress: collapse_vars/collapse_vars_switch",
			"terser compress: collapse_vars/collapse_vars_lvalues",
			"terser compress: collapse_vars/collapse_vars_lvalues_drop_assign",
			"terser compress: collapse_vars/boolean_binary_1",
			"terser compress: collapse_vars/boolean_binary_2",
			"terser compress: collapse_vars/may_throw_2",
			"terser compress: collapse_vars/cascade_if_1",
			"terser compress: collapse_vars/cond_branch_1",
			"terser compress: collapse_vars/issue_2873_1"
		]
	],
	[
		"oxc goes further than webpack on what terser's `reduce_vars` tests cover",
		[
			"terser compress: reduce_vars/inner_var_if",
			"terser compress: reduce_vars/issue_1595_4",
			"terser compress: reduce_vars/unary_delete",
			"terser compress: reduce_vars/side_effects_assign",
			"terser compress: reduce_vars/immutable",
			"terser compress: reduce_vars/recursive_inlining_4",
			"terser compress: reduce_vars/var_if",
			"terser compress: reduce_vars/issue_3068_2",
			"terser compress: reduce_vars/reduce_funcs_in_array_1",
			"terser compress: reduce_vars/reduce_funcs_in_array_2",
			"terser compress: reduce_vars/reduce_funcs_in_object_literal_2",
			"terser compress: reduce_vars/issue_639"
		]
	],
	[
		"mangled-name choice: the same program with other mangled names, or one name given to other bindings",
		[
			"oxc minifier: peephole/dead_code_elimination.rs:does_not_duplicate_large_tracked_strings_when_folding_addition:f66fbcb4",
			"oxc minifier: peephole/fold_constants.rs:test_does_not_duplicate_large_tracked_strings_when_folding_addition:f66fbcb4",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_inline_read_before_await_tdz:ea77cd81",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_rewrite_arguments_copy_loop:27442282",
			"swc exec: issue_10095",
			"swc exec: terser_issue_t292_no_flatten_with_arg_colliding_with_arg_value_inner_scope",
			"swc minifier: fixture/issues/12311/input.js",
			"swc minifier: fixture/issues/object-accessor-function-boundary/input.js",
			"terser compress: async/for_await_of",
			"terser compress: async/for_await_of_2",
			"terser compress: class-properties/private_properties_can_be_mangled",
			"terser compress: collapse_vars/issue_2313_1",
			"terser compress: drop-unused/class_used_within_itself_7_var_expname",
			"terser compress: harmony/format_methods",
			"terser compress: issue-t292/no_flatten_with_arg_colliding_with_arg_value_inner_scope",
			"terser compress: issue_1014/ternary_and_private_methods",
			"terser compress: sequences/issue_2313",
			"terser compress: hoist_props/issue_3046",
			"terser compress: if_return/issue_2747",
			"terser compress: reduce_vars/issue_581",
			"swc minifier: fixture/issues/10281/input.js",
			"swc minifier: fixture/issues/11684/with-scope/input.js",
			"swc minifier: fixture/projects/underscore/7/input.js",
			"swc exec: terser_hoist_props_issue_3046",
			"oxc minifier: peephole/dead_code_elimination.rs:dce_remove_unreachable_after_terminating_statement:84da5db4",
			"oxc minifier: peephole/minimize_exit_points.rs:test_dont_test_block_scoped_variables_in_loops:4e4b6818",
			"oxc minifier: peephole/minimize_statements.rs:test_for_in_block_scoped_no_inline:9457a854",
			"oxc minifier: peephole/minimize_statements.rs:test_for_in_block_scoped_no_inline:b1a58ea3",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_rewrite_arguments_copy_loop:8e3f76ac",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_rewrite_arguments_copy_loop:0a408432",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_rewrite_arguments_copy_loop:265af62b",
			"swc minifier: fixture/issues/5846/input.js",
			"swc minifier: fixture/projects/backbone/11/input.js"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `ecmascript/is_literal_value.rs` tests cover",
		[
			"oxc minifier: ecmascript/is_literal_value.rs:test_unary_expressions:4122c393",
			"oxc minifier: ecmascript/is_literal_value.rs:test_object_expression:d354a195"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/minimize_not_expression.rs` tests cover",
		[
			"oxc minifier: peephole/minimize_not_expression.rs:minimize_nots_with_de_morgan_comparison_chains:4fb663e6",
			"oxc minifier: peephole/minimize_not_expression.rs:minimize_nots_with_de_morgan_comparison_chains:bec4382e",
			"oxc minifier: peephole/minimize_not_expression.rs:minimize_nots_with_de_morgan_negative_cases:59c79131",
			"oxc minifier: peephole/minimize_not_expression.rs:minimize_nots_with_de_morgan_negative_cases:6dec11df",
			"oxc minifier: peephole/minimize_not_expression.rs:minimize_nots_with_binary_expressions:377fe14b",
			"oxc minifier: peephole/minimize_not_expression.rs:minimize_nots_with_binary_expressions:20507118"
		]
	],
	[
		"oxc goes further than webpack on what terser's `drop-unused` tests cover",
		[
			"terser compress: drop-unused/issue_t161_top_retain_14",
			"terser compress: drop-unused/issue_t161_top_retain_15",
			"terser compress: drop-unused/unused_class_which_extends_might_throw",
			"terser compress: drop-unused/unused_class_which_might_throw_2",
			"terser compress: drop-unused/unused_class_which_might_throw_3",
			"terser compress: drop-unused/unused_class_which_might_throw_4",
			"terser compress: drop-unused/class_used_within_itself_3_var_expname",
			"terser compress: drop-unused/issue_1715_3"
		]
	],
	[
		"oxc drops more unused declarations, as oxc's `peephole/remove_unused_declaration.rs` tests show",
		[
			"oxc minifier: peephole/remove_unused_declaration.rs:for_head_reachability_uses_ordinary_references:761ca00f",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_pure_iife_init:ef075c57",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_variable_declaration:0eed9e73",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_variable_declaration:e77b52b7",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_declaration_after_dead_direct_eval:fe381e7a",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_declaration_after_dead_direct_eval:88da6d3b",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_declaration_with_optional_eval:90e4edaa",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_class_identifier_heritage_under_assumptions:f76f0549",
			"oxc minifier: peephole/remove_unused_declaration.rs:keep_class_cycle_with_wrapped_arrow_heritage:289c61a1",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_recursive_function_after_direct_eval_dropped:b5643c66",
			"oxc minifier: peephole/remove_unused_declaration.rs:catch_var_preserves_enclosing_binding:55aa1e93",
			"oxc minifier: peephole/remove_unused_declaration.rs:regenerated_var_links_enclosing_catch:6442c2c3",
			"oxc minifier: peephole/remove_unused_declaration.rs:regenerated_var_preserves_surviving_catch_binding:ab4d900a"
		]
	],
	[
		"oxc goes further than webpack on what terser's `switch` tests cover",
		[
			"terser compress: switch/drop_default_1",
			"terser compress: switch/drop_default_2",
			"terser compress: switch/remove_switch_9",
			"terser compress: switch/drop_case",
			"terser compress: switch/issue_445",
			"terser compress: switch/collapse_same_branches_not_in_a_row_ensure_no_evaluate_elad",
			"terser compress: switch/trim_empty_last_branches",
			"terser compress: switch/trim_empty_last_branches_3",
			"terser compress: switch/collapse_same_branches_as_default_not_in_a_row"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/merge_assignments_to_declarations.rs` tests cover",
		[
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:merge_assignments_to_declarations_let:94cabaed",
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:take_leading_assignments_from_statements:fdadcf79",
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:take_leading_assignments_from_statements:f9d77d0b"
		]
	],
	[
		"oxc inlines more constants and functions, as oxc's `peephole/inline.rs` tests show",
		[
			"oxc minifier: peephole/inline.rs:small_value:36d4255e",
			"oxc minifier: peephole/inline.rs:small_value:4ea70421",
			"oxc minifier: peephole/inline.rs:small_value:ff51252e",
			"oxc minifier: peephole/inline.rs:dead_code_depending_on_const:265c1e7e",
			"oxc minifier: peephole/inline.rs:inline_constant_iife_arguments:dfbac248",
			"oxc minifier: peephole/inline.rs:unmapped_parameters_allow_unused_writes:7ba04818",
			"oxc minifier: peephole/inline.rs:unconditional_var_declarator_positions_still_inline:bf87dce3",
			"oxc minifier: peephole/inline.rs:readonly_var_unsafe_preceding_call:1eb03d7d",
			"oxc minifier: peephole/inline.rs:fold_writeonce_falsy_var_in_boolean_context:50cc1a84",
			"oxc minifier: peephole/inline.rs:fold_writeonce_falsy_var_in_boolean_context:2da4a852",
			"oxc minifier: peephole/inline.rs:keep_value_context_read_of_uninitialized_binding:94241331",
			"oxc minifier: peephole/inline.rs:keep_value_context_read_of_uninitialized_binding:a598b493",
			"oxc minifier: peephole/inline.rs:keep_value_context_read_of_uninitialized_binding:cbef8531",
			"oxc minifier: peephole/inline.rs:keep_value_context_read_of_uninitialized_binding:d101145e"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/obscure_edge_cases.rs` tests cover",
		[
			"oxc minifier: peephole/obscure_edge_cases.rs:test_mathematical_expression_edge_cases:e7cb440a",
			"oxc minifier: peephole/obscure_edge_cases.rs:test_mathematical_expression_edge_cases:cdc6a5ea"
		]
	],
	[
		"oxc writes a variable's value at its one read and drops the variable, as oxc's `peephole/inline_single_use_variable.rs` tests show",
		[
			"oxc minifier: peephole/inline_single_use_variable.rs:test_inline_single_use_variable:97e094a0",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_inline_single_use_variable:c33cbaec",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_inline_single_use_variable:56aac854",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_within_same_variable_declarations:191c71de",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_within_same_variable_declarations:ff938d95",
			"oxc minifier: peephole/inline_single_use_variable.rs:integration:4454b44c",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_inline_into_callee_keeps_this:f8121b21",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_inline_single_use_variable:596dbb37",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_inline_single_use_variable:59bac7af",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_inline_single_use_variable:68b616b6",
			"oxc minifier: peephole/inline_single_use_variable.rs:test_inline_single_use_variable:eb8e3c06"
		]
	],
	[
		"oxc goes further than webpack on what terser's `mangleprops-computed` tests cover",
		[
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_1",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_3",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_4",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_5",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_6",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_7",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_8",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_9",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_10",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_1",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_3",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_4",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_5",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_6",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_7",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_8",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_9",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_10",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_property_access_sub",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_property_access_sub",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_optional_property_access_sub",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_optional_property_access_sub"
		]
	],
	[
		"oxc goes further than webpack on what terser's `mangleprops-strict-computed` tests cover",
		[
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_1",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_3",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_4",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_5",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_6",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_7",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_8",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_9",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_10",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_1",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_3",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_4",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_5",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_6",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_7",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_8",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_9",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_10",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_property_access_sub",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_property_access_sub",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_optional_property_access_sub",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_optional_property_access_sub"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/merge_imports.rs` tests cover",
		[
			"oxc minifier: peephole/merge_imports.rs:merge_imports:d84079f6",
			"swc minifier: fixture/issues/12185/input.js"
		]
	],
	[
		"oxc goes further than webpack on what terser's `conditionals` tests cover",
		[
			"terser compress: conditionals/ifs_1",
			"terser compress: conditionals/ifs_2",
			"terser compress: conditionals/ifs_5",
			"terser compress: conditionals/cond_5",
			"terser compress: conditionals/cond_7",
			"terser compress: conditionals/cond_7_1",
			"terser compress: conditionals/issue_1154",
			"terser compress: conditionals/issue_2535_1",
			"terser compress: conditionals/ifs_same_consequent"
		]
	],
	[
		"oxc goes further than webpack on what terser's `loops` tests cover",
		[
			"terser compress: loops/drop_if_break_4",
			"terser compress: loops/drop_if_else_break_4",
			"terser compress: loops/issue_1532",
			"terser compress: loops/issue_1648",
			"terser compress: loops/in_parenthesis_3"
		]
	],
	[
		"oxc's own integration cases, several transforms combined, as oxc's `peephole/oxc.rs` tests show",
		[
			"oxc minifier: peephole/oxc.rs:integration:a8444c20",
			"oxc minifier: peephole/oxc.rs:integration:57a853fd",
			"oxc minifier: peephole/oxc.rs:integration:eaa0962c",
			"oxc minifier: peephole/oxc.rs:integration:438e194f"
		]
	],
	[
		"oxc goes further than webpack on what terser's `evaluate` tests cover",
		[
			"terser compress: evaluate/issue_2207_3",
			"terser compress: evaluate/bitwise_1",
			"terser compress: evaluate/issue_2535_3"
		]
	],
	[
		"oxc writes `if` statements shorter, as oxc's `peephole/minimize_if_statement.rs` tests show",
		[
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:a0349765",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:fdd168a6",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:b08316f7",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:096d8e8a",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:3c29c818",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:1987e8a7",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:b2c0ebf7",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:795cfb69",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:8948ef88",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:72b63932",
			"oxc minifier: peephole/minimize_if_statement.rs:test_minimize_if:17cf343e"
		]
	],
	[
		"oxc goes further than webpack on what terser's `functions` tests cover",
		[
			"terser compress: functions/recursive_inline_1",
			"terser compress: functions/issue_2783",
			"terser compress: functions/issue_2898",
			"terser compress: functions/issue_3076"
		]
	],
	[
		"oxc goes further than webpack on what terser's `dead-code` tests cover",
		[
			"terser compress: dead-code/dead_code_const_annotation_regex",
			"terser compress: dead-code/dead_code_const_annotation_complex_scope",
			"terser compress: dead-code/return_assignment"
		]
	],
	[
		"oxc reads a global twice as one value, as in `a ? b : a` to `a && b` or `a === null || a === void 0` to `a == null`, where webpack takes a global for a getter that may answer each read anew",
		[
			"oxc minifier: peephole/minimize_conditional_expression.rs:minimize_conditional_exprs:20fe2370"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `ecmascript/value_type.rs` tests cover",
		["oxc minifier: ecmascript/value_type.rs:logical_tests:a75ae814"]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/minimize_switch_statements.rs` tests cover",
		[
			"oxc minifier: peephole/minimize_switch_statements.rs:test_drop_unreachable_switch_cases_with_sequence_expressions:743a3fbe"
		]
	],
	[
		"inlining: a function, a call in place or a single-use value written where it is used by one side and kept apart by the other",
		[
			"swc exec: issue_6899_1",
			"swc exec: issue_6899_2",
			"terser compress: blocks/issue_1664",
			"terser compress: collapse_vars/collapse_vars_array",
			"terser compress: collapse_vars/collapse_vars_object",
			"terser compress: inline/dont_inline_funcs_into_default_param_2",
			"swc minifier: fixture/issues/12223/nested-function-control/input.js"
		]
	],
	[
		'oxc converts the operands of `Math.pow` or `"".concat` in another order, writing `a ** +b`, a template or one `concat` for a chain of them, where a getter or `valueOf` of one may see what converting the other did',
		[
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_math_functions_pow:365c2ee7",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_math_functions_pow:99383491",
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_math_functions_pow:7f63fa9b"
		]
	],
	[
		"oxc goes further than webpack on what terser's `sequences` tests cover",
		["terser compress: sequences/side_effects_cascade_3"]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/fold_constants.rs` tests cover",
		[
			"oxc minifier: peephole/fold_constants.rs:test_fold_unary:68957583",
			"oxc minifier: peephole/fold_constants.rs:test_fold_object_spread_drop_walks_argument_refs:2dfff3ce",
			"oxc minifier: peephole/fold_constants.rs:test_fold_object_spread_drop_walks_argument_refs:f3c4025e"
		]
	],
	[
		"oxc's output is wrong: it writes `x -= 1` as `--x` and `x -= -1` as `++x` on a name or property that may hold a BigInt, where the input throws a TypeError and the update does not; webpack, like swc, rewrites only a name holding only numbers",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_property_write_side_effects_support:3718a312",
			"oxc minifier: ecmascript/value_type.rs:assignment_tests:600fd3c4",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_assignments:7af226b8",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_assignments:435b962b",
			"oxc minifier: peephole/minimize_conditions.rs:test_fold_assignments:a9d9fb5b",
			"oxc minifier: peephole/obscure_edge_cases.rs:test_assignment_optimization_edge_cases:441d72d5",
			"oxc minifier: peephole/real_world_patterns.rs:test_assignment_optimization:441d72d5",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_fold_subtraction_assignment:d7492cb5",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:test_fold_subtraction_assignment:c929bbf6"
		]
	],
	[
		"oxc goes further than webpack on what terser's `harmony` tests cover",
		["terser compress: harmony/class_extends"]
	],
	[
		"oxc goes further than webpack on what terser's `pure_funcs` tests cover",
		[
			"terser compress: pure_funcs/relational",
			"terser compress: pure_funcs/issue_2638",
			"terser compress: pure_funcs/issue_2705_6",
			"terser compress: pure_funcs/issue_526_1"
		]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/next` tests cover",
		[
			"swc minifier: fixture/next/chakra/input.js",
			"swc minifier: fixture/next/47005/input.js",
			"swc minifier: fixture/next/66378/input.js",
			"swc minifier: fixture/next/octokit/static/chunks/357-72bd409f1472b1b8/input.js",
			"swc minifier: fixture/next/react-chartjs/input.js"
		]
	],
	[
		"oxc goes further than webpack on what terser's `issue-1052` tests cover",
		[
			"terser compress: issue-1052/not_hoisted_when_already_nested",
			"terser compress: issue-1052/defun_if_return",
			"terser compress: issue-1052/defun_hoist_funs",
			"terser compress: issue-1052/defun_else_if_return"
		]
	],
	[
		"oxc goes further than webpack on what terser's `destructuring` tests cover",
		[
			"terser compress: destructuring/destructuring_remove_unused_2",
			"terser compress: destructuring/destructuring_decl_of_computed_key",
			"terser compress: destructuring/destructuring_assign_of_computed_key"
		]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/terser` tests cover",
		[
			"swc minifier: fixture/terser/issue-2435-1/1/input.js",
			"swc minifier: fixture/terser/issue-2435-1/3/input.js",
			"swc minifier: fixture/terser/issue-2435-1/4/input.js"
		]
	],
	[
		"oxc goes further than webpack on what terser's `if_return` tests cover",
		["terser compress: if_return/if_return_same_value"]
	],
	[
		"oxc goes further than webpack on what terser's `issue-640` tests cover",
		[
			"terser compress: issue-640/cond_5",
			"terser compress: issue-640/dead_code_const_annotation_regex"
		]
	],
	[
		"oxc goes further than webpack on what terser's `transform` tests cover",
		["terser compress: transform/while_if_break"]
	],
	[
		"oxc drops an unread deferred or source-phase import, assuming its load cannot fail, where webpack keeps it as oxc's `invalid_import_side_effects` does, since it still fetches and links its module",
		[
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_import_source_statement:40d2f5a2",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_import_source_statement:c8f0f937",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_import_defer_statements:760e89a5",
			"oxc minifier: peephole/remove_unused_declaration.rs:remove_unused_import_defer_statements:3852fa64"
		]
	],
	[
		"oxc drops a `var` written in a `with` body, where the write may set a property of the `with` object instead",
		[
			"terser compress: issue-1105/check_drop_unused_in_peer_function",
			"terser compress: issue-1105/compress_with_with_in_other_scope",
			"terser compress: issue-1105/with_in_function_scope",
			"terser compress: issue-1105/with_using_existing_variable_outside_scope"
		]
	],
	[
		"oxc goes further than webpack on what terser's `block-scope` tests cover",
		["terser compress: block-scope/switch_block_scope_mangler"]
	],
	[
		"oxc goes further than webpack on what terser's `pure_getters` tests cover",
		[
			"terser compress: pure_getters/impure_getter_1",
			"terser compress: pure_getters/impure_getter_2",
			"terser compress: pure_getters/issue_2313_7"
		]
	],
	[
		"boolean and conditional forms: `!a&&b` vs `a?!1:b`, `!!a` vs `a&&!0`, `x||void 0` vs `if(x)`, an `if` with or without braces, a test's branches swapped",
		[
			"swc minifier: fixture/projects/jquery/2/input.js",
			"terser compress: collapse_vars/issue_2878"
		]
	],
	[
		"constant folding: webpack writes a computed value (a string, `NaN`, an element) where the rival keeps the expression that makes it",
		[
			"terser compress: template-string/template_string_with_predefined_constants"
		]
	],
	[
		"where a declaration goes: a `let`, `var` or function declaration placed earlier or later, or its first value assigned apart",
		[
			"swc minifier: fixture/projects/backbone/12/input.js",
			"swc minifier: fixture/projects/backbone/16/input.js"
		]
	],
	[
		"oxc drops what nothing reads or what has no effect: unused variables, functions, parameters and pure expressions",
		[
			"terser compress: reduce_vars/issue_t1382",
			"terser compress: typescript/typescript_disabled_interface",
			"swc minifier: fixture/issues/11730_class_expr/input.js",
			"swc minifier: fixture/issues/6422/3/input.js",
			"swc minifier: fixture/issues/cycle-1/input.js",
			"swc minifier: fixture/issues/cycle-2/input.js"
		]
	],
	[
		"oxc writes `const` as `let` and joins neighboring declarations",
		[
			"terser compress: arguments/modified",
			"swc minifier: fixture/issues/framer-motion/1/input.js"
		]
	],
	[
		"oxc's mangler picks shorter or better-compressing names",
		[
			"swc minifier: fixture/issues/11645/with-parent-scope-nested-block/input.js",
			"swc minifier: fixture/projects/react/15/input.js",
			"swc minifier: fixture/projects/mootools/8/input.js"
		]
	],
	[
		"oxc's output is wrong: it calls a method read through `(0, o.f)`, `(t = o.f)` or an arrow returning it as a method of `o`, and an `eval` so read as a direct `eval`",
		[
			"swc exec: indirect_eval_1",
			"oxc minifier: peephole/oxc.rs:tagged_template:9c57704f",
			"oxc minifier: peephole/remove_unused_expression.rs:remove_unused_assignment_expression:daa71f8e"
		]
	],
	[
		"oxc goes further than webpack on what terser's `global_defs` tests cover",
		["terser compress: global_defs/issue_2167"]
	],
	[
		"oxc goes further than webpack on what terser's `issue-1447` tests cover",
		[
			"terser compress: issue-1447/else_with_empty_block",
			"terser compress: issue-1447/else_with_empty_statement",
			"terser compress: issue-1447/conditional_false_stray_else_in_loop"
		]
	],
	[
		"oxc goes further than webpack on what terser's `issue-1639` tests cover",
		["terser compress: issue-1639/issue_1639_1"]
	],
	[
		"oxc goes further than webpack on what terser's `labels` tests cover",
		["terser compress: labels/labels_3", "terser compress: labels/labels_4"]
	],
	[
		"oxc goes further than webpack on what terser's `issue-1482` tests cover",
		[
			"terser input: issue-1482/braces.js",
			"terser input: issue-1482/default.js",
			"terser input: issue-1482/input.js"
		]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/pr` tests cover",
		[
			"swc minifier: fixture/pr/11814_class_effect_guards/input.js",
			"swc minifier: fixture/pr/11987/input.js"
		]
	],
	[
		"oxc goes further than webpack on what swc's `pass-1` tests cover",
		[
			"swc minifier: pass-1/issue-6123/1/input.js",
			"swc minifier: pass-1/issue-6405/1/input.js"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `mangler/property_mangler.rs` tests cover",
		[]
	],
	[
		"oxc writes a variable's value at its one read and drops the variable, or an alias of another binding",
		[
			"swc minifier: fixture/issues/10807/input.js",
			"swc minifier: fixture/issues/7241/input.js",
			"swc minifier: fixture/issues/firebase/dist/1/input.js",
			"swc minifier: fixture/issues/react-instancesearch/004/input.js",
			"swc minifier: fixture/projects/next/extra/if_return/.3/input.js",
			"terser compress: harmony/module_enabled",
			"terser compress: reduce_vars/unsafe_evaluate_side_effect_free_2",
			"swc minifier: fixture/issues/7004/input.js",
			"swc minifier: fixture/issues/react/hooks/2/input.js",
			"swc minifier: fixture/issues/react/hooks/4/input.js"
		]
	],
	[
		"oxc restructures conditionals: an `if` as `&&` or `?:`, a shared tail factored out, a redundant branch or jump dropped",
		[
			"swc minifier: fixture/issues/10986/input.js",
			"swc minifier: fixture/issues/12565/if_generator_alt/input.js",
			"swc minifier: fixture/issues/7784/3/input.js",
			"swc minifier: fixture/issues/7847/input.js",
			"swc minifier: fixture/issues/d3-color/1/input.js",
			"swc minifier: fixture/issues/do-while-false-terminal-jump/rejected/input.js",
			"swc minifier: fixture/projects/angular/5/input.js",
			"swc minifier: fixture/projects/backbone/13/input.js",
			"swc minifier: fixture/projects/backbone/14/input.js",
			"swc minifier: fixture/projects/backbone/17/input.js",
			"swc minifier: fixture/projects/backbone/20/input.js",
			"swc minifier: fixture/projects/backbone/3/input.js",
			"swc minifier: fixture/projects/backbone/5/input.js",
			"swc minifier: fixture/projects/jquery/.17/input.js",
			"swc minifier: fixture/projects/jquery/1/input.js",
			"swc minifier: fixture/projects/jquery/10/input.js",
			"swc minifier: fixture/projects/jquery/12/input.js",
			"swc minifier: fixture/projects/jquery/15/input.js",
			"swc minifier: fixture/projects/jquery/20/input.js",
			"swc minifier: fixture/projects/jquery/21/input.js",
			"swc minifier: fixture/projects/jquery/23/input.js",
			"swc minifier: fixture/projects/jquery/24/input.js",
			"swc minifier: fixture/projects/jquery/28/input.js",
			"swc minifier: fixture/projects/jquery/4/input.js",
			"swc minifier: fixture/projects/mootools/10/input.js",
			"swc minifier: fixture/projects/mootools/7/input.js",
			"swc minifier: fixture/projects/react/13/input.js",
			"swc minifier: fixture/projects/react/16/input.js",
			"swc minifier: fixture/projects/underscore/20/input.js",
			"swc minifier: fixture/projects/underscore/23/input.js",
			"swc minifier: fixture/projects/underscore/8/input.js",
			"swc minifier: fixture/projects/underscore/9/input.js",
			"swc minifier: fixture/projects/yui/10/input.js",
			"swc minifier: fixture/projects/yui/14/input.js",
			"oxc minifier: peephole/inline_single_use_variable.rs:integration:f6a7c302",
			"swc minifier: full/size/bfb48fed563e5fb468b88b6a6670972c3ca7ee38/input.js"
		]
	],
	[
		"oxc picks shorter spellings for comparisons, coercions and literals",
		[
			"swc minifier: fixture/issues/11082/input.js",
			"swc minifier: fixture/projects/backbone/2/input.js"
		]
	],
	[
		"oxc drops an unused `Symbol.for`, which webpack keeps: running it at build time would keep its key in the build's own symbol registry",
		[]
	],
	[
		"oxc's output is wrong: it drops a write in a `for…of` or `for…in` right side to the loop's own `let`, which throws a ReferenceError there, as its own test keeps it",
		[
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:take_leading_assignments_edge_cases:67dfa8bc",
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:take_leading_assignments_edge_cases:36b86207"
		]
	],
	[
		"oxc goes further than webpack on what terser's `class-properties` tests cover",
		[
			"terser compress: class-properties/computed_class_properties",
			"terser compress: class-properties/same_name_public_private"
		]
	],
	[
		"oxc goes further than webpack on what terser's `issue-1833` tests cover",
		[]
	],
	[
		"oxc goes further than webpack on what terser's `try-catch` tests cover",
		["terser compress: try-catch/catch_destructuring_with_sequence"]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/collapse-vars` tests cover",
		[]
	],
	[
		"a shorter operator oxc writes: `**` for `Math.pow` of numbers",
		["terser compress: evaluate/issue_2207_1"]
	],
	[
		"oxc drops `new` before a built-in that constructs the same when called",
		["swc minifier: fixture/issues/12187/input.js"]
	],
	[
		"oxc writes classes, methods and object literals shorter",
		["swc exec: object_spread_proto_key_is_not_flattened"]
	],
	[
		"oxc's output differs: it drops a name read in a `with` body, which runs the object's `has` trap or getter",
		["oxc minifier: peephole/esbuild.rs:test_remove_dead_expr:9efdba42"]
	],
	[
		"oxc's output differs: it drops an unused class extending a regular expression, whose definition throws a TypeError",
		["terser compress: harmony/class_extends_regex"]
	],
	[
		"oxc's output is wrong: it renames `slot` inside a `with` body, so a `slot` property on the `with` object is no longer called",
		[
			"oxc minifier: peephole/dead_code_elimination.rs:fold_optional_chain_on_undefined_var_binding:c86f6e8d"
		]
	],
	[
		"oxc's output is wrong: it renames a `#private` name a direct `eval` reads, so the `eval` throws a SyntaxError",
		[
			"oxc minifier: peephole/remove_unused_private_members.rs:test_remove_unused_private_fields:b5575e50"
		]
	],
	[
		"oxc's output is wrong: it reads a `let` that a skipped `case` declares as its value, where the input throws a ReferenceError in the binding's dead zone",
		[
			"oxc minifier: peephole/minimize_switch_statements.rs:test_drop_unreachable_switch_cases_tdz_in_case:b7c87873"
		]
	],
	[
		"oxc goes further than webpack on what terser's `arrays` tests cover",
		["terser compress: arrays/for_loop"]
	],
	[
		"oxc goes further than webpack on what terser's `issue-1006` tests cover",
		["terser compress: issue-1006/issue_1006"]
	],
	[
		"oxc goes further than webpack on what terser's `issue-368` tests cover",
		["terser compress: issue-368/collapse"]
	],
	[
		"oxc goes further than webpack on what terser's `issue-611` tests cover",
		["terser compress: issue-611/issue_611"]
	],
	[
		"oxc goes further than webpack on what terser's `parameters` tests cover",
		["terser compress: parameters/destructuring_arguments_3"]
	],
	[
		"oxc goes further than webpack on what terser's `pure_globals` tests cover",
		["terser compress: pure_globals/globals_whose_access_is_pure"]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/reduced` tests cover",
		["swc minifier: fixture/reduced/2/input.js"]
	],
	[
		"webpack reads `o.p` off `var o={p:1}` as `1` where oxc keeps the object: raw shrinks, yet deflate matches the three functions alike, each keeping its object, better than one left without it",
		[
			"terser compress: reduce_vars/unsafe_evaluate_side_effect_free_1",
			"swc exec: terser_reduce_vars_unsafe_evaluate_side_effect_free_1"
		]
	],
	[
		'webpack folds `10..toPrecision(1)` to `"1e+1"` where oxc keeps the call: raw shrinks, yet deflate matches the same call repeated with only its literal changing better than the strings it answers',
		["swc minifier: fixture/issues/6957/exponential/input.js"]
	],
	[
		"oxc folds a `parseFloat` of more than 20 digits, which ECMAScript lets an engine round otherwise, so webpack keeps the call",
		[
			"oxc minifier: peephole/replace_known_methods.rs:test_fold_parse_numbers:624d93e7"
		]
	],
	[
		"oxc goes further than webpack on what terser's `issue-143` tests cover",
		[
			"terser compress: issue-143/transformation_sort_order_lesser_or_equal",
			"terser compress: issue-143/transformation_sort_order_greater_or_equal"
		]
	],
	[
		"oxc goes further than webpack on what terser's `typescript` tests cover",
		[
			"terser compress: typescript/typescript_disabled_call_type_parameters_are_valid_js"
		]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/simple` tests cover",
		["swc minifier: fixture/simple/sequences/.0001/input.js"]
	],
	[
		"oxc's output differs: it drops a class whose static member's computed key may be `\"prototype\"`, which throws a TypeError as the class is defined",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:closure_compiler_tests:5090748d",
			"oxc minifier: ecmascript/may_have_side_effects.rs:closure_compiler_tests:1858505e",
			"oxc minifier: ecmascript/may_have_side_effects.rs:test_class_expression:3d0fe40c",
			"oxc minifier: peephole/remove_unused_expression.rs:remove_unused_class_expression:0afd5ce2",
			"oxc minifier: peephole/remove_unused_expression.rs:remove_unused_class_expression:2f9eb778"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/manual_pure_functions.rs` tests cover",
		["oxc minifier: peephole/manual_pure_functions.rs:relational:b7ef1faa"]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/issues` tests cover",
		[
			"swc minifier: fixture/issues/12643/input.js",
			"swc minifier: fixture/issues/12643/runtime/input.js",
			"swc minifier: fixture/issues/12669/class-methods/input.js",
			"swc minifier: fixture/issues/12669/function-kinds/input.js",
			"swc minifier: fixture/issues/12669/object-method/input.js"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `mangler/mod.rs` tests cover",
		["oxc minifier: mangler/mod.rs:labels:87859be1"]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/collapse_variable_declarations.rs` tests cover",
		[
			"oxc minifier: peephole/collapse_variable_declarations.rs:test_for:6e2e98b1",
			"oxc minifier: peephole/collapse_variable_declarations.rs:test_for:c653ed6a",
			"oxc minifier: peephole/collapse_variable_declarations.rs:test_for_in:857ae255",
			"oxc minifier: peephole/collapse_variable_declarations.rs:test_for_in:cb19c11b",
			"oxc minifier: peephole/collapse_variable_declarations.rs:test_for_of:6b88309d",
			"oxc minifier: peephole/collapse_variable_declarations.rs:test_for_of:7ce2fe6a"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/statement_fusion.rs` tests cover",
		[
			"oxc minifier: peephole/statement_fusion.rs:fuse_into_label:032248f2",
			"oxc minifier: peephole/statement_fusion.rs:fuse_into_label:0b9d916c",
			"oxc minifier: peephole/statement_fusion.rs:fuse_into_label:55fd2a60"
		]
	]
];

/** @type {Record<string, string>} */
const OXC_SMALLER = {};
for (const [reason, sources] of OXC_SMALLER_BY_REASON) {
	for (const source of sources) OXC_SMALLER[source] = reason;
}

module.exports = OXC_SMALLER;
