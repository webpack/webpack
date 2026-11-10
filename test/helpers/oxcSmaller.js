"use strict";

// cspell:ignore argname argnames autowhatever chartjs concattenating constdef cryptojs defun destructurings dont elad expname fargs feeback firestore fnames funs hoofd instancesearch joda lvalues mangleprop mangleprops noinline nonmatching outstatic plotly propmangle redef

// What oxc's minifier does that webpack's does not yet, each with the sources
// whose output under the default minimizer's options is bigger than oxc's.
// Biggest group first: retire a source once it is no longer bigger.

/** @type {[string, string[]][]} */
const OXC_SMALLER_BY_REASON = [
	[
		"oxc evaluates built-in calls and reads on literals at build time",
		[
			"oxc minifier: peephole/replace_known_methods.rs:49",
			"oxc minifier: peephole/replace_known_methods.rs:204",
			"oxc minifier: peephole/replace_known_methods.rs:205",
			"oxc minifier: peephole/replace_known_methods.rs:206",
			"oxc minifier: peephole/replace_known_methods.rs:207",
			"oxc minifier: peephole/replace_known_methods.rs:209",
			"oxc minifier: peephole/replace_known_methods.rs:210",
			"oxc minifier: peephole/replace_known_methods.rs:392",
			"oxc minifier: peephole/replace_known_methods.rs:393",
			"oxc minifier: peephole/replace_known_methods.rs:394",
			"oxc minifier: peephole/replace_known_methods.rs:395",
			"oxc minifier: peephole/replace_known_methods.rs:397",
			"oxc minifier: peephole/replace_known_methods.rs:398",
			"oxc minifier: peephole/replace_known_methods.rs:425",
			"oxc minifier: peephole/replace_known_methods.rs:426",
			"oxc minifier: peephole/replace_known_methods.rs:427",
			"oxc minifier: peephole/replace_known_methods.rs:428",
			"oxc minifier: peephole/replace_known_methods.rs:430",
			"oxc minifier: peephole/replace_known_methods.rs:431",
			"oxc minifier: peephole/replace_known_methods.rs:931",
			"oxc minifier: peephole/replace_known_methods.rs:932",
			"oxc minifier: peephole/replace_known_methods.rs:933",
			"oxc minifier: peephole/replace_known_methods.rs:961",
			"oxc minifier: peephole/replace_known_methods.rs:962",
			"oxc minifier: peephole/replace_known_methods.rs:963",
			"oxc minifier: peephole/replace_known_methods.rs:1063",
			"oxc minifier: peephole/replace_known_methods.rs:1067"
		]
	],
	[
		"oxc applies esbuild's shortenings, as oxc's `peephole/esbuild.rs` tests show",
		[
			"oxc minifier: peephole/esbuild.rs:1541",
			"oxc minifier: peephole/esbuild.rs:1213",
			"oxc minifier: peephole/esbuild.rs:1220",
			"oxc minifier: peephole/esbuild.rs:1796",
			"oxc minifier: peephole/esbuild.rs:2307",
			"oxc minifier: peephole/esbuild.rs:252",
			"oxc minifier: peephole/esbuild.rs:159",
			"oxc minifier: peephole/esbuild.rs:168",
			"oxc minifier: peephole/esbuild.rs:169",
			"oxc minifier: peephole/esbuild.rs:170",
			"oxc minifier: peephole/esbuild.rs:174",
			"oxc minifier: peephole/esbuild.rs:214",
			"oxc minifier: peephole/esbuild.rs:219",
			"oxc minifier: peephole/esbuild.rs:220",
			"oxc minifier: peephole/esbuild.rs:221",
			"oxc minifier: peephole/esbuild.rs:223",
			"oxc minifier: peephole/esbuild.rs:224",
			"oxc minifier: peephole/esbuild.rs:243",
			"oxc minifier: peephole/esbuild.rs:382",
			"oxc minifier: peephole/esbuild.rs:425",
			"oxc minifier: peephole/esbuild.rs:533",
			"oxc minifier: peephole/esbuild.rs:534",
			"oxc minifier: peephole/esbuild.rs:535",
			"oxc minifier: peephole/esbuild.rs:536",
			"oxc minifier: peephole/esbuild.rs:539",
			"oxc minifier: peephole/esbuild.rs:540",
			"oxc minifier: peephole/esbuild.rs:541",
			"oxc minifier: peephole/esbuild.rs:542",
			"oxc minifier: peephole/esbuild.rs:594",
			"oxc minifier: peephole/esbuild.rs:597",
			"oxc minifier: peephole/esbuild.rs:598",
			"oxc minifier: peephole/esbuild.rs:657",
			"oxc minifier: peephole/esbuild.rs:665",
			"oxc minifier: peephole/esbuild.rs:680",
			"oxc minifier: peephole/esbuild.rs:681",
			"oxc minifier: peephole/esbuild.rs:739",
			"oxc minifier: peephole/esbuild.rs:741",
			"oxc minifier: peephole/esbuild.rs:743",
			"oxc minifier: peephole/esbuild.rs:744",
			"oxc minifier: peephole/esbuild.rs:745",
			"oxc minifier: peephole/esbuild.rs:746",
			"oxc minifier: peephole/esbuild.rs:822",
			"oxc minifier: peephole/esbuild.rs:826",
			"oxc minifier: peephole/esbuild.rs:830",
			"oxc minifier: peephole/esbuild.rs:834",
			"oxc minifier: peephole/esbuild.rs:838",
			"oxc minifier: peephole/esbuild.rs:842",
			"oxc minifier: peephole/esbuild.rs:846",
			"oxc minifier: peephole/esbuild.rs:850",
			"oxc minifier: peephole/esbuild.rs:854",
			"oxc minifier: peephole/esbuild.rs:858",
			"oxc minifier: peephole/esbuild.rs:862",
			"oxc minifier: peephole/esbuild.rs:866",
			"oxc minifier: peephole/esbuild.rs:890",
			"oxc minifier: peephole/esbuild.rs:894",
			"oxc minifier: peephole/esbuild.rs:898",
			"oxc minifier: peephole/esbuild.rs:902",
			"oxc minifier: peephole/esbuild.rs:906",
			"oxc minifier: peephole/esbuild.rs:910",
			"oxc minifier: peephole/esbuild.rs:1030",
			"oxc minifier: peephole/esbuild.rs:1129",
			"oxc minifier: peephole/esbuild.rs:1151",
			"oxc minifier: peephole/esbuild.rs:1152",
			"oxc minifier: peephole/esbuild.rs:1153",
			"oxc minifier: peephole/esbuild.rs:1154",
			"oxc minifier: peephole/esbuild.rs:1158",
			"oxc minifier: peephole/esbuild.rs:1159",
			"oxc minifier: peephole/esbuild.rs:1163",
			"oxc minifier: peephole/esbuild.rs:1179",
			"oxc minifier: peephole/esbuild.rs:1542",
			"oxc minifier: peephole/esbuild.rs:1546",
			"oxc minifier: peephole/esbuild.rs:1550",
			"oxc minifier: peephole/esbuild.rs:1633",
			"oxc minifier: peephole/esbuild.rs:1652",
			"oxc minifier: peephole/esbuild.rs:1792",
			"oxc minifier: peephole/esbuild.rs:1984",
			"oxc minifier: peephole/esbuild.rs:2272",
			"oxc minifier: peephole/esbuild.rs:2434"
		]
	],
	[
		"oxc knows more expressions have no side effects and drops them when their value is unused, as oxc's `ecmascript/may_have_side_effects.rs` tests show",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:745",
			"oxc minifier: ecmascript/may_have_side_effects.rs:744",
			"oxc minifier: ecmascript/may_have_side_effects.rs:743",
			"oxc minifier: ecmascript/may_have_side_effects.rs:388",
			"oxc minifier: ecmascript/may_have_side_effects.rs:387",
			"oxc minifier: ecmascript/may_have_side_effects.rs:386",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1300",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1365",
			"oxc minifier: ecmascript/may_have_side_effects.rs:783",
			"oxc minifier: ecmascript/may_have_side_effects.rs:907",
			"oxc minifier: ecmascript/may_have_side_effects.rs:213",
			"oxc minifier: ecmascript/may_have_side_effects.rs:214",
			"oxc minifier: ecmascript/may_have_side_effects.rs:215",
			"oxc minifier: ecmascript/may_have_side_effects.rs:216",
			"oxc minifier: ecmascript/may_have_side_effects.rs:392",
			"oxc minifier: ecmascript/may_have_side_effects.rs:393",
			"oxc minifier: ecmascript/may_have_side_effects.rs:394",
			"oxc minifier: ecmascript/may_have_side_effects.rs:395",
			"oxc minifier: ecmascript/may_have_side_effects.rs:398",
			"oxc minifier: ecmascript/may_have_side_effects.rs:399",
			"oxc minifier: ecmascript/may_have_side_effects.rs:403",
			"oxc minifier: ecmascript/may_have_side_effects.rs:404",
			"oxc minifier: ecmascript/may_have_side_effects.rs:405",
			"oxc minifier: ecmascript/may_have_side_effects.rs:406",
			"oxc minifier: ecmascript/may_have_side_effects.rs:441",
			"oxc minifier: ecmascript/may_have_side_effects.rs:627",
			"oxc minifier: ecmascript/may_have_side_effects.rs:636",
			"oxc minifier: ecmascript/may_have_side_effects.rs:760",
			"oxc minifier: ecmascript/may_have_side_effects.rs:784",
			"oxc minifier: ecmascript/may_have_side_effects.rs:791",
			"oxc minifier: ecmascript/may_have_side_effects.rs:792",
			"oxc minifier: ecmascript/may_have_side_effects.rs:801",
			"oxc minifier: ecmascript/may_have_side_effects.rs:809",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1036",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1047",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1146",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1401",
			"swc minifier: fixture/issues/9460/side-effects/input.js",
			"swc minifier: fixture/issues/12566/defaults/input.js",
			"swc minifier: fixture/issues/12566/without-reduce-vars/input.js"
		]
	],
	[
		"webpack writes the same program in a spelling longer or compressing worse than oxc's",
		[
			"oxc minifier: peephole/minimize_statements.rs:32",
			"oxc minifier: peephole/replace_known_methods.rs:1090",
			"swc exec: terser_arguments_modified",
			"swc minifier: fixture/issues/10412/input.js",
			"swc minifier: fixture/issues/11684/identifier-preserved/input.js",
			"swc minifier: fixture/issues/4249/input.js",
			"swc minifier: fixture/issues/arguments-canonical-index/input.js",
			"swc minifier: fixture/projects/jquery/25/input.js",
			"swc minifier: fixture/projects/jquery/27/input.js",
			"swc minifier: fixture/projects/yui/12/input.js",
			"swc minifier: fixture/projects/yui/13/input.js",
			"swc minifier: pass-1/7/input.js",
			"terser compress: asm/asm_mixed",
			"terser compress: collapse_vars/collapse_rhs_conditional_2",
			"terser compress: concat-strings/concat_1",
			"terser compress: conditionals/ifs_6",
			"terser compress: evaluate/unsafe_array",
			"terser compress: export/name_cache_import_star_as_name_from_module",
			"terser compress: ascii/ascii_only_true",
			"terser compress: ascii/ascii_only_false",
			"terser compress: collapse_vars/collapse_vars_while",
			"terser compress: collapse_vars/cond_branch_2",
			"terser compress: collapse_vars/issue_2914_1",
			"terser compress: collapse_vars/issue_2914_2",
			"terser compress: drop-unused/delete_assign_1",
			"terser compress: drop-unused/delete_assign_2",
			"terser compress: drop-unused/issue_1838",
			"terser compress: drop-unused/issue_3146_3",
			"terser compress: drop-unused/issue_3146_4",
			"terser compress: evaluate/unsafe_constant",
			"terser compress: export/name_cache_do_not_mangle_export_let_name",
			"terser compress: export/name_cache_do_not_mangle_export_const_name",
			"terser compress: issue-1413/issue_1413_top_retain_reference_shorter_than_value_2",
			"terser compress: issue-1656/f7",
			"terser compress: loops/keep_collapse_const_in_own_block_scope_2",
			"terser compress: properties/join_object_assignments_NaN_1",
			"terser compress: properties/join_object_assignments_NaN_2",
			"terser compress: reduce_vars/inner_var_for_2",
			"terser compress: reduce_vars/toplevel_on_loops_3",
			"terser compress: reduce_vars/toplevel_off_loops_3",
			"terser compress: reduce_vars/variables_collision_in_immediately_invoked_func",
			"terser compress: reduce_vars/issue_294",
			"terser compress: sequences/make_sequences_2",
			"terser compress: unicode/issue_3271",
			"swc minifier: benches-full/echarts.js",
			"swc minifier: benches-full/moment.js",
			"swc minifier: benches-full/react.js",
			"swc minifier: benches-full/three.js",
			"swc minifier: benches-full/victory.js",
			"swc minifier: benches-full/vue.js",
			"swc minifier: fixture/issues/12189/input.js",
			"swc minifier: fixture/issues/12215/input.js",
			"swc minifier: fixture/issues/12218/leading-argument/input.js",
			"swc minifier: fixture/issues/12565/while_body/input.js",
			"swc minifier: fixture/issues/firebase-core/1/input.js",
			"swc minifier: fixture/next/66237/input.js",
			"swc minifier: fixture/next/feedback-3/579-dcac359116b2707c/input.js",
			"swc minifier: fixture/next/regression-1/framework-798bab57daac3897/input.js",
			"swc minifier: fixture/next/styled-components/1/input.js",
			"swc minifier: fixture/next/target-es2015/static/chunks/main-04b5934c26266542/input.js",
			"swc minifier: fixture/projects/next/.archive-4/framework-054ead69ea8124b4cb27/input.js",
			"swc minifier: fixture/projects/next/.archive-4/polyfills-6437a4964f697e5b0b3e/input.js",
			"swc minifier: fixture/projects/next/archive-2/pages/hmr/.counter-c6a48518c4a56e4d9ce5/input.js",
			"swc minifier: fixture/projects/underscore/16/input.js",
			"swc minifier: fixture/projects/underscore/17/input.js",
			"swc minifier: fixture/projects/underscore/18/input.js",
			"swc minifier: mangle/2/input.js",
			"swc exec: terser_drop_unused_delete_assign_1",
			"swc exec: terser_drop_unused_issue_3146_3",
			"swc exec: terser_drop_unused_issue_3146_4",
			"swc exec: terser_drop_unused_delete_assign_2",
			"swc exec: terser_reduce_vars_inner_var_for_2",
			"swc exec: terser_collapse_vars_issue_2914_2",
			"swc exec: terser_collapse_vars_cond_branch_2",
			"swc exec: terser_properties_join_object_assignments_nan_2",
			"oxc minifier: ecmascript/is_int32_or_uint32.rs:72",
			"oxc minifier: ecmascript/is_int32_or_uint32.rs:73",
			"oxc minifier: ecmascript/is_int32_or_uint32.rs:77",
			"oxc minifier: ecmascript/is_int32_or_uint32.rs:79",
			"oxc minifier: ecmascript/may_have_side_effects.rs:622",
			"oxc minifier: ecmascript/may_have_side_effects.rs:623",
			"oxc minifier: ecmascript/may_have_side_effects.rs:628",
			"oxc minifier: ecmascript/may_have_side_effects.rs:629",
			"oxc minifier: ecmascript/may_have_side_effects.rs:639",
			"oxc minifier: ecmascript/may_have_side_effects.rs:640",
			"oxc minifier: ecmascript/may_have_side_effects.rs:641",
			"oxc minifier: ecmascript/may_have_side_effects.rs:642",
			"oxc minifier: ecmascript/value_type.rs:162",
			"oxc minifier: ecmascript/value_type.rs:163",
			"oxc minifier: ecmascript/value_type.rs:167",
			"oxc minifier: ecmascript/value_type.rs:169",
			"oxc minifier: peephole/dead_code_elimination.rs:664",
			"oxc minifier: peephole/esbuild.rs:202",
			"oxc minifier: peephole/esbuild.rs:222",
			"oxc minifier: peephole/esbuild.rs:705",
			"oxc minifier: peephole/esbuild.rs:707",
			"oxc minifier: peephole/esbuild.rs:1519",
			"oxc minifier: peephole/esbuild.rs:1520",
			"oxc minifier: peephole/esbuild.rs:1522",
			"oxc minifier: peephole/esbuild.rs:1523",
			"oxc minifier: peephole/fold_constants.rs:761",
			"oxc minifier: peephole/fold_constants.rs:765",
			"oxc minifier: peephole/fold_constants.rs:769",
			"oxc minifier: peephole/inline.rs:165",
			"oxc minifier: peephole/inline.rs:600",
			"oxc minifier: peephole/inline.rs:601",
			"oxc minifier: peephole/inline.rs:603",
			"oxc minifier: peephole/inline.rs:604",
			"oxc minifier: peephole/inline.rs:715",
			"oxc minifier: peephole/inline.rs:716",
			"oxc minifier: peephole/minimize_conditions.rs:175",
			"oxc minifier: peephole/minimize_conditions.rs:297",
			"oxc minifier: peephole/minimize_conditions.rs:410",
			"oxc minifier: peephole/minimize_conditions.rs:896",
			"oxc minifier: peephole/minimize_conditions.rs:897",
			"oxc minifier: peephole/minimize_exit_points.rs:78",
			"oxc minifier: peephole/minimize_exit_points.rs:122",
			"oxc minifier: peephole/minimize_if_statement.rs:5",
			"oxc minifier: peephole/obscure_edge_cases.rs:463",
			"oxc minifier: peephole/remove_unused_declaration.rs:494",
			"oxc minifier: peephole/statement_fusion.rs:103",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:190",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:549",
			"terser compress: conditionals/cond_9",
			"terser compress: transform/if_return",
			"swc minifier: fixture/issues/7412/input.js",
			"swc minifier: fixture/issues/12196/input.js",
			"swc minifier: fixture/projects/mootools/.11/input.js"
		]
	],
	[
		"oxc drops more unused expressions, as oxc's `peephole/remove_unused_expression.rs` tests show",
		[
			"oxc minifier: peephole/remove_unused_expression.rs:452",
			"oxc minifier: peephole/remove_unused_expression.rs:449",
			"oxc minifier: peephole/remove_unused_expression.rs:31",
			"oxc minifier: peephole/remove_unused_expression.rs:62",
			"oxc minifier: peephole/remove_unused_expression.rs:63",
			"oxc minifier: peephole/remove_unused_expression.rs:64",
			"oxc minifier: peephole/remove_unused_expression.rs:66",
			"oxc minifier: peephole/remove_unused_expression.rs:131",
			"oxc minifier: peephole/remove_unused_expression.rs:140",
			"oxc minifier: peephole/remove_unused_expression.rs:160",
			"oxc minifier: peephole/remove_unused_expression.rs:277",
			"oxc minifier: peephole/remove_unused_expression.rs:300",
			"oxc minifier: peephole/remove_unused_expression.rs:453",
			"oxc minifier: peephole/remove_unused_expression.rs:506",
			"oxc minifier: peephole/remove_unused_expression.rs:602",
			"oxc minifier: peephole/remove_unused_expression.rs:792",
			"oxc minifier: peephole/remove_unused_expression.rs:840",
			"oxc minifier: peephole/remove_unused_expression.rs:848",
			"oxc minifier: peephole/remove_unused_expression.rs:862",
			"oxc minifier: peephole/remove_unused_expression.rs:863",
			"oxc minifier: peephole/remove_unused_expression.rs:872",
			"oxc minifier: peephole/remove_unused_expression.rs:873",
			"oxc minifier: peephole/remove_unused_expression.rs:1116",
			"oxc minifier: peephole/remove_unused_expression.rs:1120",
			"oxc minifier: peephole/remove_unused_expression.rs:1313"
		]
	],
	[
		"real-world code, where no one transform above accounts for half the gap: several cut opposite ways, or the rival restructures the program too far for a token diff to attribute",
		[
			"swc minifier: fixture/issues/emotion/react/2/input.js",
			"swc minifier: fixture/issues/vercel/004/input.js"
		]
	],
	[
		"oxc substitutes shorter syntax, as oxc's `peephole/substitute_alternate_syntax.rs` tests show",
		[
			"oxc minifier: peephole/substitute_alternate_syntax.rs:165",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:166",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:169",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:170",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:668",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:903",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:914",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:1065",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:1081",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:1129",
			"swc minifier: fixture/issues/7749/input.js",
			"swc minifier: fixture/issues/8826/input.js",
			"swc minifier: fixture/projects/jquery/26/input.js"
		]
	],
	[
		"oxc normalizes the syntax before compressing it, as oxc's `peephole/normalize.rs` tests show",
		[
			"oxc minifier: peephole/normalize.rs:230",
			"oxc minifier: peephole/normalize.rs:274",
			"oxc minifier: peephole/normalize.rs:94",
			"oxc minifier: peephole/normalize.rs:95",
			"oxc minifier: peephole/normalize.rs:177",
			"oxc minifier: peephole/normalize.rs:349",
			"oxc minifier: peephole/normalize.rs:353",
			"oxc minifier: peephole/normalize.rs:363"
		]
	],
	[
		"oxc writes conditions shorter, as oxc's `peephole/minimize_conditions.rs` tests show",
		[
			"oxc minifier: peephole/minimize_conditions.rs:1066",
			"oxc minifier: peephole/minimize_conditions.rs:223",
			"oxc minifier: peephole/minimize_conditions.rs:6",
			"oxc minifier: peephole/minimize_conditions.rs:7",
			"oxc minifier: peephole/minimize_conditions.rs:9",
			"oxc minifier: peephole/minimize_conditions.rs:10",
			"oxc minifier: peephole/minimize_conditions.rs:13",
			"oxc minifier: peephole/minimize_conditions.rs:17",
			"oxc minifier: peephole/minimize_conditions.rs:24",
			"oxc minifier: peephole/minimize_conditions.rs:25",
			"oxc minifier: peephole/minimize_conditions.rs:26",
			"oxc minifier: peephole/minimize_conditions.rs:43",
			"oxc minifier: peephole/minimize_conditions.rs:45",
			"oxc minifier: peephole/minimize_conditions.rs:51",
			"oxc minifier: peephole/minimize_conditions.rs:53",
			"oxc minifier: peephole/minimize_conditions.rs:74",
			"oxc minifier: peephole/minimize_conditions.rs:135",
			"oxc minifier: peephole/minimize_conditions.rs:136",
			"oxc minifier: peephole/minimize_conditions.rs:231",
			"oxc minifier: peephole/minimize_conditions.rs:232",
			"oxc minifier: peephole/minimize_conditions.rs:233",
			"oxc minifier: peephole/minimize_conditions.rs:302",
			"oxc minifier: peephole/minimize_conditions.rs:303",
			"oxc minifier: peephole/minimize_conditions.rs:304",
			"oxc minifier: peephole/minimize_conditions.rs:310",
			"oxc minifier: peephole/minimize_conditions.rs:329",
			"oxc minifier: peephole/minimize_conditions.rs:335",
			"oxc minifier: peephole/minimize_conditions.rs:341",
			"oxc minifier: peephole/minimize_conditions.rs:368",
			"oxc minifier: peephole/minimize_conditions.rs:426",
			"oxc minifier: peephole/minimize_conditions.rs:432",
			"oxc minifier: peephole/minimize_conditions.rs:471",
			"oxc minifier: peephole/minimize_conditions.rs:494",
			"oxc minifier: peephole/minimize_conditions.rs:495",
			"oxc minifier: peephole/minimize_conditions.rs:781",
			"oxc minifier: peephole/minimize_conditions.rs:783",
			"oxc minifier: peephole/minimize_conditions.rs:792",
			"oxc minifier: peephole/minimize_conditions.rs:793",
			"oxc minifier: peephole/minimize_conditions.rs:1018",
			"oxc minifier: peephole/minimize_conditions.rs:1019",
			"oxc minifier: peephole/minimize_conditions.rs:1020",
			"oxc minifier: peephole/minimize_conditions.rs:1224",
			"oxc minifier: peephole/minimize_conditions.rs:1243",
			"oxc minifier: peephole/minimize_conditions.rs:1252",
			"swc minifier: fixture/projects/backbone/4/input.js"
		]
	],
	[
		"oxc goes further than webpack on what swc's `exec.rs` tests cover",
		[
			"swc exec: next_feedback_1_capture_1",
			"swc exec: emotion_react_1",
			"swc exec: terser_drop_unused_issue_t161_top_retain_15",
			"swc exec: terser_drop_unused_issue_1709",
			"swc exec: terser_drop_unused_issue_1968",
			"swc exec: terser_drop_unused_issue_1715_4",
			"swc exec: terser_pure_getters_impure_getter_2",
			"swc exec: terser_destructuring_destructuring_assign_of_computed_key",
			"swc exec: terser_issue_1447_conditional_false_stray_else_in_loop",
			"swc exec: terser_labels_labels_3",
			"swc exec: terser_reduce_vars_issue_2420_2",
			"swc exec: terser_reduce_vars_side_effects_assign",
			"swc exec: terser_reduce_vars_issue_1670_1",
			"swc exec: terser_reduce_vars_recursive_inlining_4",
			"swc exec: terser_reduce_vars_reduce_vars",
			"swc exec: terser_reduce_vars_issue_1670_2",
			"swc exec: terser_reduce_vars_escape_local_sequence",
			"swc exec: terser_reduce_vars_issue_1670_4",
			"swc exec: terser_reduce_vars_issue_1670_3",
			"swc exec: terser_collapse_vars_cond_branch_1",
			"swc exec: terser_collapse_vars_issue_2203_4",
			"swc exec: terser_collapse_vars_issue_2203_3",
			"swc exec: terser_collapse_vars_var_defs",
			"swc exec: terser_collapse_vars_issue_2203_2",
			"swc exec: terser_collapse_vars_may_throw_2",
			"swc exec: terser_properties_join_object_assignments_return_2",
			"swc exec: terser_issue_1639_issue_1639_1",
			"swc exec: terser_arrays_for_loop",
			"swc exec: terser_switch_issue_1663",
			"swc exec: terser_functions_issue_2898",
			"swc exec: terser_functions_issue_3016_2",
			"swc exec: terser_functions_issue_2783",
			"swc exec: terser_try_catch_catch_destructuring_with_sequence",
			"swc exec: try_catch_2",
			"swc exec: try_catch_5",
			"swc exec: issue_6903_1",
			"swc exec: issue_6903_2",
			"swc exec: issue_6903_3",
			"swc exec: issue_11517_continue",
			"swc exec: issue_11078_math_constant_folding"
		]
	],
	[
		"oxc drops a redundant last `return`, `break` or `continue`, as oxc's `peephole/minimize_exit_points.rs` tests show",
		[
			"oxc minifier: peephole/minimize_exit_points.rs:178",
			"oxc minifier: peephole/minimize_exit_points.rs:60",
			"oxc minifier: peephole/minimize_exit_points.rs:61",
			"oxc minifier: peephole/minimize_exit_points.rs:62",
			"oxc minifier: peephole/minimize_exit_points.rs:65",
			"oxc minifier: peephole/minimize_exit_points.rs:74",
			"oxc minifier: peephole/minimize_exit_points.rs:82",
			"oxc minifier: peephole/minimize_exit_points.rs:85",
			"oxc minifier: peephole/minimize_exit_points.rs:130",
			"oxc minifier: peephole/minimize_exit_points.rs:169",
			"oxc minifier: peephole/minimize_exit_points.rs:175",
			"oxc minifier: peephole/minimize_exit_points.rs:264",
			"oxc minifier: peephole/minimize_exit_points.rs:274",
			"oxc minifier: peephole/minimize_exit_points.rs:284",
			"oxc minifier: peephole/minimize_exit_points.rs:309",
			"oxc minifier: peephole/minimize_exit_points.rs:396",
			"oxc minifier: peephole/minimize_exit_points.rs:432",
			"swc minifier: fixture/issues/4841/1/input.js"
		]
	],
	[
		"oxc drops more unreachable code, as oxc's `peephole/remove_dead_code.rs` tests show",
		[
			"oxc minifier: peephole/remove_dead_code.rs:263",
			"oxc minifier: peephole/remove_dead_code.rs:24",
			"oxc minifier: peephole/remove_dead_code.rs:30",
			"oxc minifier: peephole/remove_dead_code.rs:63",
			"oxc minifier: peephole/remove_dead_code.rs:77",
			"oxc minifier: peephole/remove_dead_code.rs:86",
			"oxc minifier: peephole/remove_dead_code.rs:294",
			"swc minifier: fixture/issues/12299/input.js",
			"swc minifier: fixture/issues/9619/input.js",
			"swc minifier: fixture/issues/9628/input.js"
		]
	],
	[
		"oxc drops more dead code, as oxc's `peephole/dead_code_elimination.rs` tests show",
		[
			"oxc minifier: peephole/dead_code_elimination.rs:1047",
			"oxc minifier: peephole/dead_code_elimination.rs:631",
			"oxc minifier: peephole/dead_code_elimination.rs:636",
			"oxc minifier: peephole/dead_code_elimination.rs:641",
			"oxc minifier: peephole/dead_code_elimination.rs:647",
			"oxc minifier: peephole/dead_code_elimination.rs:729",
			"oxc minifier: peephole/dead_code_elimination.rs:734",
			"oxc minifier: peephole/dead_code_elimination.rs:744",
			"oxc minifier: peephole/dead_code_elimination.rs:749",
			"oxc minifier: peephole/dead_code_elimination.rs:754",
			"oxc minifier: peephole/dead_code_elimination.rs:126",
			"oxc minifier: peephole/dead_code_elimination.rs:127",
			"oxc minifier: peephole/dead_code_elimination.rs:128",
			"oxc minifier: peephole/dead_code_elimination.rs:129",
			"oxc minifier: peephole/dead_code_elimination.rs:133",
			"oxc minifier: peephole/dead_code_elimination.rs:137",
			"oxc minifier: peephole/dead_code_elimination.rs:141",
			"oxc minifier: peephole/dead_code_elimination.rs:153",
			"oxc minifier: peephole/dead_code_elimination.rs:158",
			"oxc minifier: peephole/dead_code_elimination.rs:438",
			"oxc minifier: peephole/dead_code_elimination.rs:804",
			"oxc minifier: peephole/dead_code_elimination.rs:841",
			"oxc minifier: peephole/dead_code_elimination.rs:842",
			"oxc minifier: peephole/dead_code_elimination.rs:843",
			"oxc minifier: peephole/dead_code_elimination.rs:867",
			"oxc minifier: peephole/dead_code_elimination.rs:908",
			"oxc minifier: peephole/dead_code_elimination.rs:955",
			"oxc minifier: peephole/dead_code_elimination.rs:990",
			"oxc minifier: peephole/dead_code_elimination.rs:1068",
			"oxc minifier: peephole/dead_code_elimination.rs:560",
			"oxc minifier: peephole/dead_code_elimination.rs:561"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/minimize_conditional_expression.rs` tests cover",
		[
			"oxc minifier: peephole/minimize_conditional_expression.rs:61",
			"oxc minifier: peephole/minimize_conditional_expression.rs:79",
			"oxc minifier: peephole/minimize_conditional_expression.rs:121"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/minimize_statements.rs` tests cover",
		[
			"oxc minifier: peephole/minimize_statements.rs:114",
			"oxc minifier: peephole/minimize_statements.rs:115",
			"oxc minifier: peephole/minimize_statements.rs:116",
			"oxc minifier: peephole/minimize_statements.rs:137",
			"oxc minifier: peephole/minimize_statements.rs:141",
			"oxc minifier: peephole/minimize_statements.rs:245",
			"oxc minifier: peephole/minimize_statements.rs:246",
			"oxc minifier: peephole/minimize_statements.rs:278",
			"oxc minifier: peephole/minimize_statements.rs:279",
			"oxc minifier: peephole/minimize_statements.rs:284",
			"oxc minifier: peephole/minimize_statements.rs:285",
			"oxc minifier: peephole/minimize_statements.rs:313",
			"oxc minifier: peephole/minimize_statements.rs:374",
			"oxc minifier: peephole/minimize_statements.rs:376"
		]
	],
	[
		"`,` vs `;` statements: the same statements joined into one sequence where the rival writes them apart, or a sequence's expressions lifted out or kept in another order",
		[
			"terser compress: conditionals/issue_2560",
			"terser compress: evaluate/regexp_property_eval",
			"terser compress: evaluate/issue_t790_strings_larger_than_refs",
			"terser compress: evaluate/issue_t790_strings_smaller_than_refs",
			"terser compress: ie8/do_screw_try_catch_undefined",
			"terser compress: ie8/dont_screw_try_catch_undefined",
			"terser compress: reduce_vars/unsafe_evaluate_object_1",
			"terser compress: reduce_vars/escaped_prop_3",
			"terser compress: reduce_vars/escape_await",
			"swc minifier: fixture/issues/2044/full/input.js",
			"swc minifier: fixture/issues/4386/1/input.js",
			"swc minifier: fixture/issues/4386/2/input.js",
			"swc minifier: fixture/issues/react-autosuggest/1/input.js",
			"swc minifier: fixture/projects/jquery/9/input.js",
			"swc minifier: fixture/projects/next/extra/if_return/2/input.js",
			"swc exec: terser_reduce_vars_escaped_prop_3",
			"swc exec: issues_2011_2",
			"oxc minifier: peephole/remove_unused_expression.rs:1030",
			"swc minifier: fixture/issues/2078/1/input.js",
			"swc minifier: fixture/issues/6864/input.js",
			"swc minifier: fixture/projects/jquery/18/input.js",
			"swc minifier: fixture/projects/next/extra/if_return/.4/input.js",
			"terser compress: inline/inline_into_scope_conflict_enclosed",
			"terser compress: yield/yield_before_punctuators",
			"swc minifier: fixture/issues/8737/input.js",
			"swc minifier: fixture/issues/9756/input.js"
		]
	],
	[
		"oxc goes further than webpack on what terser's `collapse_vars` tests cover",
		[
			"terser compress: collapse_vars/collapse_vars_switch",
			"terser compress: collapse_vars/switch_case_2",
			"terser compress: collapse_vars/collapse_vars_lvalues",
			"terser compress: collapse_vars/collapse_vars_lvalues_drop_assign",
			"terser compress: collapse_vars/collapse_vars_repeated",
			"terser compress: collapse_vars/collapse_vars_arguments",
			"terser compress: collapse_vars/var_defs",
			"terser compress: collapse_vars/boolean_binary_1",
			"terser compress: collapse_vars/boolean_binary_2",
			"terser compress: collapse_vars/issue_2203_2",
			"terser compress: collapse_vars/issue_2203_3",
			"terser compress: collapse_vars/issue_2203_4",
			"terser compress: collapse_vars/issue_2313_2",
			"terser compress: collapse_vars/issue_2497",
			"terser compress: collapse_vars/may_throw_2",
			"terser compress: collapse_vars/cascade_if_1",
			"terser compress: collapse_vars/unsafe_builtin",
			"terser compress: collapse_vars/cond_branch_1",
			"terser compress: collapse_vars/issue_2873_1",
			"terser compress: collapse_vars/issue_1562"
		]
	],
	[
		"oxc goes further than webpack on what terser's `reduce_vars` tests cover",
		[
			"terser compress: reduce_vars/reduce_vars",
			"terser compress: reduce_vars/inner_var_if",
			"terser compress: reduce_vars/issue_1595_4",
			"terser compress: reduce_vars/issue_1670_1",
			"terser compress: reduce_vars/issue_1670_2",
			"terser compress: reduce_vars/issue_1670_3",
			"terser compress: reduce_vars/issue_1670_4",
			"terser compress: reduce_vars/unary_delete",
			"terser compress: reduce_vars/side_effects_assign",
			"terser compress: reduce_vars/immutable",
			"terser compress: reduce_vars/issue_2420_2",
			"terser compress: reduce_vars/recursive_inlining_4",
			"terser compress: reduce_vars/issue_2455",
			"terser compress: reduce_vars/escape_local_sequence",
			"terser compress: reduce_vars/var_if",
			"terser compress: reduce_vars/issue_3068_2",
			"terser compress: reduce_vars/reduce_funcs_in_array_1",
			"terser compress: reduce_vars/reduce_funcs_in_array_2",
			"terser compress: reduce_vars/reduce_funcs_in_object_literal_2",
			"terser compress: reduce_vars/issue_443",
			"terser compress: reduce_vars/issue_639"
		]
	],
	[
		"mangled-name choice: the same program with other mangled names, or one name given to other bindings",
		[
			"oxc minifier: peephole/dead_code_elimination.rs:917",
			"oxc minifier: peephole/fold_constants.rs:1377",
			"oxc minifier: peephole/inline_single_use_variable.rs:359",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:1137",
			"swc exec: issue_10095",
			"swc exec: issue_8864_1",
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
			"terser compress: reduce_vars/issue_2420_3",
			"terser compress: reduce_vars/issue_581",
			"swc minifier: fixture/issues/10281/input.js",
			"swc minifier: fixture/issues/11684/with-scope/input.js",
			"swc minifier: fixture/projects/underscore/7/input.js",
			"swc exec: terser_hoist_props_issue_3046",
			"swc exec: terser_reduce_vars_issue_2420_3",
			"oxc minifier: peephole/dead_code_elimination.rs:1015",
			"oxc minifier: peephole/minimize_exit_points.rs:444",
			"oxc minifier: peephole/minimize_statements.rs:129",
			"oxc minifier: peephole/minimize_statements.rs:133",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:1020",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:1032",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:1140",
			"swc minifier: fixture/issues/5846/input.js",
			"swc minifier: fixture/issues/react-instancesearch/001/input.js",
			"swc minifier: fixture/projects/backbone/11/input.js"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `ecmascript/is_literal_value.rs` tests cover",
		[
			"oxc minifier: ecmascript/is_literal_value.rs:284",
			"oxc minifier: ecmascript/is_literal_value.rs:282",
			"oxc minifier: ecmascript/is_literal_value.rs:279",
			"oxc minifier: ecmascript/is_literal_value.rs:273",
			"oxc minifier: ecmascript/is_literal_value.rs:271",
			"oxc minifier: ecmascript/is_literal_value.rs:267",
			"oxc minifier: ecmascript/is_literal_value.rs:251",
			"oxc minifier: ecmascript/is_literal_value.rs:159",
			"oxc minifier: ecmascript/is_literal_value.rs:167",
			"oxc minifier: ecmascript/is_literal_value.rs:259",
			"oxc minifier: ecmascript/is_literal_value.rs:261",
			"oxc minifier: ecmascript/is_literal_value.rs:276"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/minimize_not_expression.rs` tests cover",
		[
			"oxc minifier: peephole/minimize_not_expression.rs:33",
			"oxc minifier: peephole/minimize_not_expression.rs:48",
			"oxc minifier: peephole/minimize_not_expression.rs:49",
			"oxc minifier: peephole/minimize_not_expression.rs:69",
			"oxc minifier: peephole/minimize_not_expression.rs:72",
			"oxc minifier: peephole/minimize_not_expression.rs:74",
			"oxc minifier: peephole/minimize_not_expression.rs:101",
			"oxc minifier: peephole/minimize_not_expression.rs:102"
		]
	],
	[
		"oxc goes further than webpack on what terser's `drop-unused` tests cover",
		[
			"terser compress: drop-unused/iife",
			"terser compress: drop-unused/issue_1709",
			"terser compress: drop-unused/issue_1715_4",
			"terser compress: drop-unused/issue_1830_1",
			"terser compress: drop-unused/issue_1968",
			"terser compress: drop-unused/issue_t161_top_retain_14",
			"terser compress: drop-unused/issue_t161_top_retain_15",
			"terser compress: drop-unused/unused_class_which_extends_might_throw",
			"terser compress: drop-unused/unused_class_which_might_throw_2",
			"terser compress: drop-unused/unused_class_which_might_throw_3",
			"terser compress: drop-unused/unused_class_which_might_throw_4",
			"terser compress: drop-unused/unused_null_conditional_chain_2",
			"terser compress: drop-unused/unused_null_conditional_chain_3",
			"terser compress: drop-unused/class_used_within_itself_3_var_expname"
		]
	],
	[
		"oxc drops more unused declarations, as oxc's `peephole/remove_unused_declaration.rs` tests show",
		[
			"oxc minifier: peephole/remove_unused_declaration.rs:944",
			"oxc minifier: peephole/remove_unused_declaration.rs:940",
			"oxc minifier: peephole/remove_unused_declaration.rs:181",
			"oxc minifier: peephole/remove_unused_declaration.rs:108",
			"oxc minifier: peephole/remove_unused_declaration.rs:156",
			"oxc minifier: peephole/remove_unused_declaration.rs:280",
			"oxc minifier: peephole/remove_unused_declaration.rs:298",
			"oxc minifier: peephole/remove_unused_declaration.rs:311",
			"oxc minifier: peephole/remove_unused_declaration.rs:572",
			"oxc minifier: peephole/remove_unused_declaration.rs:578",
			"oxc minifier: peephole/remove_unused_declaration.rs:892"
		]
	],
	[
		"oxc goes further than webpack on what terser's `switch` tests cover",
		[
			"terser compress: switch/drop_default_1",
			"terser compress: switch/drop_default_2",
			"terser compress: switch/remove_switch_9",
			"terser compress: switch/issue_1663",
			"terser compress: switch/drop_case",
			"terser compress: switch/issue_445",
			"terser compress: switch/collapse_same_branches_not_in_a_row_ensure_no_evaluate_elad",
			"terser compress: switch/trim_empty_last_branches",
			"terser compress: switch/trim_empty_last_branches_3"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/merge_assignments_to_declarations.rs` tests cover",
		[
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:40",
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:52",
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:53",
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:64",
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:65"
		]
	],
	[
		"oxc inlines more constants and functions, as oxc's `peephole/inline.rs` tests show",
		[
			"oxc minifier: peephole/inline.rs:710",
			"oxc minifier: peephole/inline.rs:717",
			"oxc minifier: peephole/inline.rs:718",
			"oxc minifier: peephole/inline.rs:654",
			"oxc minifier: peephole/inline.rs:18",
			"oxc minifier: peephole/inline.rs:33",
			"oxc minifier: peephole/inline.rs:171",
			"oxc minifier: peephole/inline.rs:177",
			"oxc minifier: peephole/inline.rs:353",
			"oxc minifier: peephole/inline.rs:384",
			"oxc minifier: peephole/inline.rs:577",
			"oxc minifier: peephole/inline.rs:589",
			"oxc minifier: peephole/inline.rs:684",
			"oxc minifier: peephole/inline.rs:685",
			"oxc minifier: peephole/inline.rs:686",
			"oxc minifier: peephole/inline.rs:693",
			"oxc minifier: peephole/inline.rs:747",
			"oxc minifier: peephole/inline.rs:607",
			"oxc minifier: peephole/inline.rs:612",
			"swc minifier: fixture/issues/8844/input.js",
			"swc minifier: fixture/projects/next/archive-3/pages/dynamic/no-chunk-e2d9573b8d7df68a6cde/input.js"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/obscure_edge_cases.rs` tests cover",
		[
			"oxc minifier: peephole/obscure_edge_cases.rs:133",
			"oxc minifier: peephole/obscure_edge_cases.rs:134",
			"oxc minifier: peephole/obscure_edge_cases.rs:664"
		]
	],
	[
		"oxc writes a variable's value at its one read and drops the variable, as oxc's `peephole/inline_single_use_variable.rs` tests show",
		[
			"oxc minifier: peephole/inline_single_use_variable.rs:282",
			"oxc minifier: peephole/inline_single_use_variable.rs:226",
			"oxc minifier: peephole/inline_single_use_variable.rs:277",
			"oxc minifier: peephole/inline_single_use_variable.rs:286",
			"oxc minifier: peephole/inline_single_use_variable.rs:290",
			"oxc minifier: peephole/inline_single_use_variable.rs:466",
			"oxc minifier: peephole/inline_single_use_variable.rs:475",
			"oxc minifier: peephole/inline_single_use_variable.rs:557"
		]
	],
	[
		"oxc goes further than webpack on what terser's `mangleprops-computed` tests cover",
		[
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_1",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_2",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_3",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_4",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_5",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_6",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_7",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_8",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_9",
			"terser compress: mangleprops-computed/computed_props_keep_quoted_inlined_sub_10",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_1",
			"terser compress: mangleprops-computed/no_computed_props_keep_quoted_inlined_sub_2",
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
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_2",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_3",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_4",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_5",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_6",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_7",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_8",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_9",
			"terser compress: mangleprops-strict-computed/computed_props_keep_quoted_inlined_sub_10",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_1",
			"terser compress: mangleprops-strict-computed/no_computed_props_keep_quoted_inlined_sub_2",
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
			"oxc minifier: peephole/merge_imports.rs:72",
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
			"terser compress: conditionals/issue_2535_2",
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
			"terser compress: loops/in_parenthesis_3",
			"terser compress: loops/dead_code_condition"
		]
	],
	[
		"oxc's own integration cases, several transforms combined, as oxc's `peephole/oxc.rs` tests show",
		[
			"oxc minifier: peephole/oxc.rs:23",
			"oxc minifier: peephole/oxc.rs:13",
			"oxc minifier: peephole/oxc.rs:46",
			"oxc minifier: peephole/oxc.rs:59"
		]
	],
	[
		"oxc goes further than webpack on what terser's `evaluate` tests cover",
		[
			"terser compress: evaluate/issue_2207_3",
			"terser compress: evaluate/bitwise_1",
			"terser compress: evaluate/bitwise_2",
			"terser compress: evaluate/issue_2535_3",
			"terser compress: evaluate/string_case"
		]
	],
	[
		"oxc writes `if` statements shorter, as oxc's `peephole/minimize_if_statement.rs` tests show",
		[
			"oxc minifier: peephole/minimize_if_statement.rs:74",
			"oxc minifier: peephole/minimize_if_statement.rs:78",
			"oxc minifier: peephole/minimize_if_statement.rs:82",
			"oxc minifier: peephole/minimize_if_statement.rs:49",
			"oxc minifier: peephole/minimize_if_statement.rs:61",
			"oxc minifier: peephole/minimize_if_statement.rs:90",
			"oxc minifier: peephole/minimize_if_statement.rs:91",
			"oxc minifier: peephole/minimize_if_statement.rs:92",
			"oxc minifier: peephole/minimize_if_statement.rs:93",
			"oxc minifier: peephole/minimize_if_statement.rs:94",
			"oxc minifier: peephole/minimize_if_statement.rs:95"
		]
	],
	[
		"oxc goes further than webpack on what terser's `functions` tests cover",
		[
			"terser compress: functions/empty_body",
			"terser compress: functions/recursive_inline_1",
			"terser compress: functions/issue_2783",
			"terser compress: functions/issue_2898",
			"terser compress: functions/issue_3016_2",
			"terser compress: functions/issue_3016_2_ie8",
			"terser compress: functions/issue_3016_3",
			"terser compress: functions/issue_3016_3_ie8",
			"terser compress: functions/issue_3076"
		]
	],
	[
		"oxc goes further than webpack on what terser's `dead-code` tests cover",
		[
			"terser compress: dead-code/issue_2383_3",
			"terser compress: dead-code/dead_code_2_should_warn",
			"terser compress: dead-code/dead_code_2_should_warn_strict",
			"terser compress: dead-code/dead_code_const_declaration",
			"terser compress: dead-code/dead_code_const_annotation_regex",
			"terser compress: dead-code/dead_code_const_annotation_complex_scope",
			"terser compress: dead-code/try_catch_finally",
			"terser compress: dead-code/return_assignment",
			"terser compress: dead-code/issue_2749"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/collapse_variable_declarations.rs` tests cover",
		["oxc minifier: peephole/collapse_variable_declarations.rs:97"]
	],
	[
		"oxc reads a global twice as one value, as in `a ? b : a` to `a && b` or `a === null || a === void 0` to `a == null`, where webpack takes a global for a getter that may answer each read anew",
		["oxc minifier: peephole/minimize_conditional_expression.rs:90"]
	],
	[
		"oxc goes further than webpack on what terser's `rename` tests cover",
		[
			"terser compress: rename/mangle_catch_redef_1",
			"terser compress: rename/mangle_catch_redef_1_ie8",
			"terser compress: rename/mangle_catch_redef_1_toplevel",
			"terser compress: rename/mangle_catch_redef_1_ie8_toplevel"
		]
	],
	[
		"oxc goes further than webpack on what terser's `template-string` tests cover",
		[
			"terser compress: template-string/sequence_1",
			"terser compress: template-string/sequence_2"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `ecmascript/value_type.rs` tests cover",
		[
			"oxc minifier: ecmascript/value_type.rs:158",
			"oxc minifier: ecmascript/value_type.rs:234"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/minimize_switch_statements.rs` tests cover",
		["oxc minifier: peephole/minimize_switch_statements.rs:5"]
	],
	[
		"inlining: a function, a call in place or a single-use value written where it is used by one side and kept apart by the other",
		[
			"swc minifier: fixture/projects/next/.archive-4/266-aee26c928109d49d6151/input.js",
			"oxc minifier: peephole/inline_single_use_variable.rs:47",
			"swc exec: issue_6899_1",
			"swc exec: issue_6899_2",
			"terser compress: blocks/issue_1664",
			"terser compress: collapse_vars/collapse_vars_array",
			"terser compress: collapse_vars/collapse_vars_object",
			"terser compress: inline/dont_inline_funcs_into_default_param_2",
			"swc minifier: fixture/issues/11684/preserved/input.js",
			"swc minifier: fixture/issues/12223/nested-function-control/input.js",
			"swc minifier: full/size/991835278eecab695ad3515447b5747adcdfe1b4/input.js"
		]
	],
	[
		"oxc goes further than webpack on what terser's `issue-1704` tests cover",
		[
			"terser compress: issue-1704/mangle_catch_redef_1",
			"terser compress: issue-1704/mangle_catch_redef_1_ie8",
			"terser compress: issue-1704/mangle_catch_redef_1_toplevel",
			"terser compress: issue-1704/mangle_catch_redef_1_ie8_toplevel"
		]
	],
	[
		'oxc converts the operands of `Math.pow` or `"".concat` in another order, writing `a ** +b`, a template or one `concat` for a chain of them, where a getter or `valueOf` of one may see what converting the other did',
		[
			"oxc minifier: peephole/replace_known_methods.rs:637",
			"oxc minifier: peephole/replace_known_methods.rs:638",
			"oxc minifier: peephole/replace_known_methods.rs:639"
		]
	],
	[
		"oxc goes further than webpack on what terser's `object` tests cover",
		[
			"terser compress: object/prop_arrows_to_concise_method_various",
			"terser compress: object/prop_func_to_concise_method_various"
		]
	],
	[
		"oxc goes further than webpack on what terser's `sequences` tests cover",
		[
			"terser compress: sequences/delete_seq_4",
			"terser compress: sequences/delete_seq_5",
			"terser compress: sequences/side_effects_cascade_3",
			"terser compress: sequences/make_sequences_4"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/fold_constants.rs` tests cover",
		[
			"oxc minifier: peephole/fold_constants.rs:521",
			"oxc minifier: peephole/fold_constants.rs:1681",
			"oxc minifier: peephole/fold_constants.rs:1689"
		]
	],
	[
		"oxc's output is wrong: it writes `x -= 1` as `--x` and `x -= -1` as `++x` on a name or property that may hold a BigInt, where the input throws a TypeError and the update does not; webpack, like swc, rewrites only a name holding only numbers",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:1638",
			"oxc minifier: ecmascript/value_type.rs:192",
			"oxc minifier: peephole/minimize_conditions.rs:158",
			"oxc minifier: peephole/minimize_conditions.rs:163",
			"oxc minifier: peephole/minimize_conditions.rs:166",
			"oxc minifier: peephole/obscure_edge_cases.rs:222",
			"oxc minifier: peephole/real_world_patterns.rs:79",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:150",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:151"
		]
	],
	[
		"oxc's output is wrong: it folds a string method otherwise than the spec, as its own tests now show: `slice` and `substring` keep a surrogate pair they split, an `undefined` end reads as 0, `indexOf` wraps a position past 2**32, and `trim` keeps U+FEFF and drops U+0085",
		[
			"oxc minifier: peephole/replace_known_methods.rs:449",
			"oxc minifier: peephole/replace_known_methods.rs:450",
			"oxc minifier: peephole/replace_known_methods.rs:451",
			"oxc minifier: peephole/replace_known_methods.rs:452"
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
		"oxc goes further than webpack on what terser's `properties` tests cover",
		["terser compress: properties/join_object_assignments_return_2"]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/next` tests cover",
		[
			"swc minifier: fixture/next/chakra/input.js",
			"swc minifier: fixture/next/47005/input.js",
			"swc minifier: fixture/next/66378/input.js",
			"swc minifier: fixture/next/cryptojs/input.js",
			"swc minifier: fixture/next/octokit/static/chunks/357-72bd409f1472b1b8/input.js",
			"swc minifier: fixture/next/react-chartjs/input.js"
		]
	],
	[
		"oxc goes further than webpack on what terser's `issue-1052` tests cover",
		[
			"terser compress: issue-1052/deeply_nested",
			"terser compress: issue-1052/not_hoisted_when_already_nested",
			"terser compress: issue-1052/defun_if_return",
			"terser compress: issue-1052/defun_hoist_funs",
			"terser compress: issue-1052/defun_else_if_return"
		]
	],
	[
		"oxc goes further than webpack on what swc's `mangle` tests cover",
		[
			"swc minifier: mangle/issue-5766/hoisted-in-correct-scope/5/input.js",
			"swc minifier: mangle/reuse/2/input.js"
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
		"oxc's output differs: it drops a class whose static member's computed key may be `\"prototype\"`, which throws a TypeError as the class is defined",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:445",
			"oxc minifier: ecmascript/may_have_side_effects.rs:451",
			"oxc minifier: ecmascript/may_have_side_effects.rs:816",
			"oxc minifier: peephole/remove_unused_expression.rs:850",
			"oxc minifier: peephole/remove_unused_expression.rs:865"
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
			"oxc minifier: peephole/remove_unused_declaration.rs:1086",
			"oxc minifier: peephole/remove_unused_declaration.rs:1087",
			"oxc minifier: peephole/remove_unused_declaration.rs:1105",
			"oxc minifier: peephole/remove_unused_declaration.rs:1106"
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
		"oxc goes further than webpack on what terser's `issue-1034` tests cover",
		[
			"terser compress: issue-1034/non_hoisted_function_after_return_2a",
			"terser compress: issue-1034/non_hoisted_function_after_return_2b",
			"terser compress: issue-1034/non_hoisted_function_after_return_2a_strict",
			"terser compress: issue-1034/non_hoisted_function_after_return_2b_strict"
		]
	],
	[
		"oxc goes further than webpack on what terser's `issue-143` tests cover",
		[
			"terser compress: issue-143/transformation_sort_order_equal",
			"terser compress: issue-143/transformation_sort_order_unequal",
			"terser compress: issue-143/transformation_sort_order_lesser_or_equal",
			"terser compress: issue-143/transformation_sort_order_greater_or_equal"
		]
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
		"oxc goes further than webpack on what terser's `typeof` tests cover",
		["terser compress: typeof/issue_250_1"]
	],
	[
		"oxc goes further than webpack on what terser's `yield` tests cover",
		[
			"terser compress: yield/generators_yield_assign",
			"terser compress: yield/yield_statements"
		]
	],
	[
		"oxc goes further than webpack on what oxc's `peephole/manual_pure_functions.rs` tests cover",
		["oxc minifier: peephole/manual_pure_functions.rs:119"]
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
			"swc minifier: fixture/issues/12182/receiver-sensitive/input.js",
			"swc minifier: fixture/projects/backbone/12/input.js",
			"swc minifier: fixture/projects/backbone/16/input.js"
		]
	],
	[
		"oxc drops what nothing reads or what has no effect: unused variables, functions, parameters and pure expressions",
		[
			"terser compress: drop-unused/issue_1715_3",
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
			"oxc minifier: peephole/oxc.rs:108",
			"oxc minifier: peephole/remove_unused_expression.rs:787"
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
		"oxc goes further than webpack on what terser's `issue-t50` tests cover",
		[
			"terser compress: issue-t50/issue_t50",
			"terser compress: issue-t50/issue_t50_let",
			"terser compress: issue-t50/issue_t50_const"
		]
	],
	[
		"oxc goes further than webpack on what terser's `labels` tests cover",
		["terser compress: labels/labels_3"]
	],
	[
		"oxc goes further than webpack on what terser's `nullish` tests cover",
		[
			"terser compress: nullish/simplify_nullish_coalescing",
			"terser compress: nullish/delete_nullish_2"
		]
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
			"swc minifier: fixture/pr/11987/input.js",
			"swc minifier: fixture/pr/7856/1/input.js"
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
		["oxc minifier: mangler/property_mangler.rs:79"]
	],
	[
		"oxc writes a variable's value at its one read and drops the variable, or an alias of another binding",
		[
			"swc minifier: fixture/issues/10807/input.js",
			"swc minifier: fixture/issues/5280/input.js",
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
			"swc minifier: fixture/projects/yui/8/input.js",
			"oxc minifier: peephole/inline_single_use_variable.rs:580",
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
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:1259",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1404"
		]
	],
	[
		"oxc's output is wrong: it drops a write in a `for…of` or `for…in` right side to the loop's own `let`, which throws a ReferenceError there, as its own test keeps it",
		[
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:106",
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:107"
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
		["terser compress: issue-1833/iife_do"]
	],
	[
		"oxc goes further than webpack on what terser's `try-catch` tests cover",
		["terser compress: try-catch/catch_destructuring_with_sequence"]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/collapse-vars` tests cover",
		[
			"swc minifier: fixture/collapse-vars/cascade-statement/bailouts/input.js",
			"swc minifier: fixture/collapse-vars/trivial-literal-chain/input.js"
		]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/member_expr` tests cover",
		["swc minifier: fixture/member_expr/callee/input.js"]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/simple` tests cover",
		["swc minifier: fixture/simple/sequences/.0001/input.js"]
	],
	[
		"a shorter operator oxc writes: `**` for `Math.pow` of numbers",
		["terser compress: evaluate/issue_2207_1"]
	],
	[
		"oxc drops `new` before a built-in that constructs the same when called",
		[
			"swc minifier: fixture/issues/12187/input.js",
			"swc minifier: fixture/projects/backbone/18/input.js"
		]
	],
	[
		"oxc writes classes, methods and object literals shorter",
		["swc exec: object_spread_proto_key_is_not_flattened"]
	],
	[
		"oxc folds arithmetic, comparisons and concatenation of constants",
		["swc minifier: fixture/issues/8706/input.js"]
	],
	[
		"oxc's output differs: it drops a name read in a `with` body, which runs the object's `has` trap or getter",
		["oxc minifier: peephole/esbuild.rs:1635"]
	],
	[
		"oxc's output differs: it drops an unused class extending a regular expression, whose definition throws a TypeError",
		["terser compress: harmony/class_extends_regex"]
	],
	[
		"oxc's output is wrong: it renames `slot` inside a `with` body, so a `slot` property on the `with` object is no longer called",
		["oxc minifier: peephole/dead_code_elimination.rs:878"]
	],
	[
		"oxc's output is wrong: it renames a `#private` name a direct `eval` reads, so the `eval` throws a SyntaxError",
		["oxc minifier: peephole/remove_unused_private_members.rs:27"]
	],
	[
		"oxc's output is wrong: it reads a `let` that a skipped `case` declares as its value, where the input throws a ReferenceError in the binding's dead zone",
		["oxc minifier: peephole/minimize_switch_statements.rs:65"]
	],
	[
		"oxc goes further than webpack on what terser's `arrays` tests cover",
		["terser compress: arrays/for_loop"]
	],
	[
		"oxc goes further than webpack on what terser's `big_int` tests cover",
		["terser compress: big_int/big_int_math"]
	],
	[
		"oxc goes further than webpack on what terser's `comparing` tests cover",
		["terser compress: comparing/bigint_vs_number"]
	],
	[
		"oxc goes further than webpack on what terser's `expression` tests cover",
		["terser compress: expression/pow_with_number_constants"]
	],
	[
		"oxc goes further than webpack on what terser's `hoist` tests cover",
		["terser compress: hoist/hoist_no_destructurings"]
	],
	[
		"oxc goes further than webpack on what terser's `issue-1006` tests cover",
		["terser compress: issue-1006/issue_1006"]
	],
	[
		"oxc goes further than webpack on what terser's `issue-2871` tests cover",
		["terser compress: issue-2871/comparison_with_undefined"]
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
		"oxc goes further than webpack on what terser's `optional-chains` tests cover",
		["terser compress: optional-chains/issue_1586_optional_chain_inlined_2"]
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
		"oxc goes further than webpack on what terser's `typescript` tests cover",
		[
			"terser compress: typescript/typescript_disabled_call_type_parameters_are_valid_js"
		]
	],
	[
		"oxc goes further than webpack on what swc's `fixture/check` tests cover",
		["swc minifier: fixture/check/1/input.js"]
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
		["oxc minifier: peephole/replace_known_methods.rs:790"]
	]
];

/** @type {Record<string, string>} */
const OXC_SMALLER = {};
for (const [reason, sources] of OXC_SMALLER_BY_REASON) {
	for (const source of sources) OXC_SMALLER[source] = reason;
}

module.exports = OXC_SMALLER;
