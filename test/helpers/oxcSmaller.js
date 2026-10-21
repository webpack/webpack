"use strict";

// cspell:ignore autowhatever chartjs concattenating constdef defun dont elad expname funs hoofd instancesearch mangleprop mangleprops noinline nonmatching plotly propmangle redef

// What oxc's minifier does that webpack's does not yet, each with the sources
// whose output under the default minimizer's options is bigger than oxc's.
// Biggest group first: retire a source once it is no longer bigger.

/** @type {[string, string[]][]} */
const OXC_SMALLER_BY_REASON = [
	[
		"oxc applies esbuild's shortenings, as oxc's `peephole/esbuild.rs` tests show",
		[
			"oxc minifier: peephole/esbuild.rs:1181",
			"oxc minifier: peephole/esbuild.rs:1215",
			"oxc minifier: peephole/esbuild.rs:1222",
			"oxc minifier: peephole/esbuild.rs:1598",
			"oxc minifier: peephole/esbuild.rs:1798",
			"oxc minifier: peephole/esbuild.rs:2309",
			"oxc minifier: peephole/esbuild.rs:2368",
			"oxc minifier: peephole/esbuild.rs:255",
			"oxc minifier: peephole/esbuild.rs:700"
		]
	],
	[
		"webpack writes the same program in a spelling longer or compressing worse than oxc's",
		[
			"swc exec: terser_arguments_modified",
			"swc minifier: fixture/issues/10412/input.js",
			"swc minifier: fixture/issues/10885/input.js",
			"swc minifier: fixture/issues/11368/input.js",
			"swc minifier: fixture/issues/11684/identifier-preserved/input.js",
			"swc minifier: fixture/issues/11684/identifier-side-effects/input.js",
			"swc minifier: fixture/issues/11684/scopes-and-mutations/input.js",
			"swc minifier: fixture/issues/12206/preserve-nonmatching-test-before-dynamic-case/input.js",
			"swc minifier: fixture/issues/12228/disabled/input.js",
			"swc minifier: fixture/issues/12298/input.js",
			"swc minifier: fixture/issues/12313/input.js",
			"swc minifier: fixture/issues/4249/input.js",
			"swc minifier: fixture/issues/6957/exponential/input.js",
			"swc minifier: fixture/issues/arguments-canonical-index/input.js",
			"swc minifier: fixture/projects/jquery/25/input.js",
			"swc minifier: fixture/projects/jquery/27/input.js",
			"swc minifier: fixture/projects/yui/12/input.js",
			"swc minifier: fixture/terser/issue-2535-2/2/input.js",
			"swc minifier: pass-1/7/input.js",
			"terser compress: asm/asm_mixed",
			"terser compress: assignment/op_equals_right_global_var",
			"terser compress: assignment/op_equals_right_local_var",
			"terser compress: collapse_vars/collapse_vars_side_effects_2",
			"terser compress: concat-strings/concat_1",
			"terser compress: conditionals/ifs_6",
			"terser compress: evaluate/in_boolean_context",
			"terser compress: evaluate/unsafe_array",
			"terser compress: evaluate/unsafe_integer_key",
			"terser compress: export/issue_2038_2",
			"terser compress: export/name_cache_import_star_as_name_from_module",
			"terser compress: issue-973/this_binding_sequences",
			"terser compress: lhs_constants/lhs_constants",
			"terser compress: new/new_statements_3",
			"terser compress: numbers/evaluate_1",
			"terser compress: numbers/evaluate_2",
			"terser compress: reduce_vars/multi_def_2",
			"terser compress: sequences/hoist_decl"
		]
	],
	[
		"oxc substitutes shorter syntax, as oxc's `peephole/substitute_alternate_syntax.rs` tests show",
		[
			"oxc minifier: peephole/substitute_alternate_syntax.rs:135",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:164",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:165",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:168",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:169",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:715"
		]
	],
	[
		"oxc drops what nothing reads or what has no effect: unused variables, functions, parameters and pure expressions",
		[
			"swc minifier: fixture/collapse-vars/trivial-literal-chain/input.js",
			"swc minifier: fixture/issues/9785/input.js",
			"terser compress: asm/asm_function_expression",
			"terser compress: asm/asm_nested_functions",
			"terser compress: asm/asm_toplevel",
			"terser compress: dead-code/try_catch_finally",
			"terser compress: drop-unused/issue_1715_3",
			"terser compress: reduce_vars/issue_t1382",
			"terser compress: template-string/tagged_template_with_comment",
			"terser compress: typescript/typescript_disabled_interface"
		]
	],
	[
		"oxc evaluates more built-in methods called on constants, as oxc's `peephole/replace_known_methods.rs` tests show",
		[
			"oxc minifier: peephole/replace_known_methods.rs:1071",
			"oxc minifier: peephole/replace_known_methods.rs:1073",
			"oxc minifier: peephole/replace_known_methods.rs:178",
			"oxc minifier: peephole/replace_known_methods.rs:48",
			"oxc minifier: peephole/replace_known_methods.rs:49"
		]
	],
	[
		"oxc knows more expressions have no side effects and drops them when their value is unused, as oxc's `ecmascript/may_have_side_effects.rs` tests show",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:1036",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1047",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1146",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1293",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1300",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1365",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1404",
			"oxc minifier: ecmascript/may_have_side_effects.rs:302",
			"oxc minifier: ecmascript/may_have_side_effects.rs:783",
			"oxc minifier: ecmascript/may_have_side_effects.rs:825",
			"oxc minifier: ecmascript/may_have_side_effects.rs:907"
		]
	],
	[
		"oxc writes conditions shorter, as oxc's `peephole/minimize_conditions.rs` tests show",
		[
			"oxc minifier: peephole/minimize_conditions.rs:1053",
			"oxc minifier: peephole/minimize_conditions.rs:1066",
			"oxc minifier: peephole/minimize_conditions.rs:1204",
			"oxc minifier: peephole/minimize_conditions.rs:1224",
			"oxc minifier: peephole/minimize_conditions.rs:1243",
			"oxc minifier: peephole/minimize_conditions.rs:1252",
			"oxc minifier: peephole/minimize_conditions.rs:223"
		]
	],
	[
		"real-world code, where the gap sums several of the transforms above; split it once those land",
		[
			"swc minifier: fixture/issues/d3-color/1/input.js",
			"swc minifier: fixture/next/66237/input.js",
			"swc minifier: fixture/next/asmjs/1/input.js",
			"swc minifier: fixture/projects/jquery/11/input.js",
			"swc minifier: projects/files/backbone-1.1.0.js",
			"swc minifier: projects/files/underscore-1.5.2.js"
		]
	],
	[
		"oxc writes `const` as `let` and joins neighboring declarations",
		[
			"swc minifier: fixture/issues/11684/bindings/input.js",
			"terser compress: arguments/modified",
			"terser compress: collapse_vars/collapse_rhs_loop",
			"terser compress: sequences/lift_sequences_3"
		]
	],
	[
		"oxc drops more unused expressions, as oxc's `peephole/remove_unused_expression.rs` tests show",
		[
			"oxc minifier: peephole/remove_unused_expression.rs:1169",
			"oxc minifier: peephole/remove_unused_expression.rs:160",
			"oxc minifier: peephole/remove_unused_expression.rs:514",
			"oxc minifier: peephole/remove_unused_expression.rs:636",
			"oxc minifier: peephole/remove_unused_expression.rs:665"
		]
	],
	[
		"oxc drops more dead code, as oxc's `peephole/dead_code_elimination.rs` tests show",
		[
			"oxc minifier: peephole/dead_code_elimination.rs:600",
			"oxc minifier: peephole/dead_code_elimination.rs:605",
			"oxc minifier: peephole/dead_code_elimination.rs:610",
			"oxc minifier: peephole/dead_code_elimination.rs:616",
			"oxc minifier: peephole/dead_code_elimination.rs:698",
			"oxc minifier: peephole/dead_code_elimination.rs:703",
			"oxc minifier: peephole/dead_code_elimination.rs:713",
			"oxc minifier: peephole/dead_code_elimination.rs:718",
			"oxc minifier: peephole/dead_code_elimination.rs:723",
			"oxc minifier: peephole/dead_code_elimination.rs:798",
			"oxc minifier: peephole/dead_code_elimination.rs:847",
			"oxc minifier: peephole/dead_code_elimination.rs:871"
		]
	],
	[
		"oxc drops more unused declarations, as oxc's `peephole/remove_unused_declaration.rs` tests show",
		[
			"oxc minifier: peephole/remove_unused_declaration.rs:108",
			"oxc minifier: peephole/remove_unused_declaration.rs:181"
		]
	],
	[
		"oxc's mangler picks shorter or better-compressing names",
		[
			"swc exec: issue_8964",
			"swc minifier: fixture/issues/11645/with-parent-scope-nested-block/input.js",
			"swc minifier: fixture/issues/12212/with-scope/input.js",
			"swc minifier: fixture/projects/react/15/input.js"
		]
	],
	[
		"oxc follows a variable's value through its reassignments and folds the result",
		["terser compress: drop-unused/issue_t161_top_retain_15"]
	],
	[
		"oxc normalizes the syntax before compressing it, as oxc's `peephole/normalize.rs` tests show",
		[
			"oxc minifier: peephole/normalize.rs:194",
			"oxc minifier: peephole/normalize.rs:203",
			"oxc minifier: peephole/normalize.rs:247"
		]
	],
	[
		"oxc writes a variable's value at its one read and drops the variable, or an alias of another binding",
		[
			"oxc minifier: peephole/esbuild.rs:2274",
			"swc minifier: fixture/issues/7770/2/input.js",
			"swc minifier: fixture/issues/next-97517/input.js",
			"terser compress: collapse_vars/shadowed_variable",
			"terser compress: destructuring/destructuring_remove_unused_2",
			"terser compress: harmony/module_enabled",
			"terser compress: reduce_vars/unsafe_evaluate_side_effect_free_2"
		]
	],
	[
		"oxc drops `new` before a built-in that constructs the same when called",
		["swc minifier: fixture/issues/12187/input.js"]
	],
	[
		"oxc restructures conditionals: an `if` as `&&` or `?:`, a shared tail factored out, a redundant branch or jump dropped",
		[
			"swc minifier: fixture/issues/12299/input.js",
			"swc minifier: fixture/projects/backbone/5/input.js",
			"swc minifier: fixture/projects/react/16/input.js",
			"terser compress: conditionals/issue_1674_false_equivalency_of_props"
		]
	],
	[
		"oxc drops a redundant last `return`, `break` or `continue`, as oxc's `peephole/minimize_exit_points.rs` tests show",
		[
			"oxc minifier: peephole/minimize_exit_points.rs:101",
			"oxc minifier: peephole/minimize_exit_points.rs:178",
			"oxc minifier: peephole/minimize_exit_points.rs:254",
			"oxc minifier: peephole/minimize_exit_points.rs:362",
			"oxc minifier: peephole/minimize_exit_points.rs:369",
			"oxc minifier: peephole/minimize_exit_points.rs:377"
		]
	],
	[
		"oxc picks shorter spellings for comparisons, coercions and literals",
		[
			"swc minifier: fixture/issues/11082/input.js",
			"swc minifier: fixture/issues/array-constructor-length/input.js",
			"swc minifier: fixture/projects/backbone/2/input.js"
		]
	],
	[
		"oxc evaluates built-in calls and reads on literals at build time",
		["terser compress: issue-126/concatenate_rhs_strings"]
	],
	[
		"oxc writes classes, methods and object literals shorter",
		[
			"swc exec: object_spread_proto_key_is_not_flattened",
			"terser compress: object/convert_computed_props_to_regular_ones"
		]
	],
	[
		"oxc writes a variable's value at its one read and drops the variable, as oxc's `peephole/inline_single_use_variable.rs` tests show",
		[
			"oxc minifier: peephole/inline_single_use_variable.rs:242",
			"oxc minifier: peephole/inline_single_use_variable.rs:258",
			"oxc minifier: peephole/inline_single_use_variable.rs:282",
			"oxc minifier: peephole/inline_single_use_variable.rs:286",
			"oxc minifier: peephole/inline_single_use_variable.rs:324",
			"oxc minifier: peephole/inline_single_use_variable.rs:411"
		]
	],
	[
		"oxc folds arithmetic, comparisons and concatenation of constants",
		[
			"swc exec: terser_drop_unused_issue_t161_top_retain_15",
			"terser compress: const/issue_1396",
			"terser compress: destructuring/empty_object_destructuring_misc",
			"terser compress: drop-unused/issue_t161_top_retain_13",
			"terser compress: drop-unused/issue_t161_top_retain_14",
			"terser compress: issue-368/collapse",
			"terser compress: reduce_vars/issue_3068_2"
		]
	],
	[
		"oxc inlines more constants and functions, as oxc's `peephole/inline.rs` tests show",
		[
			"oxc minifier: peephole/inline.rs:698",
			"oxc minifier: peephole/inline.rs:703",
			"oxc minifier: peephole/inline.rs:704",
			"oxc minifier: peephole/inline.rs:706",
			"oxc minifier: peephole/inline.rs:33"
		]
	],
	[
		"oxc drops unused private class members, as oxc's `peephole/remove_unused_private_members.rs` tests show",
		[
			"oxc minifier: peephole/remove_unused_private_members.rs:32",
			"oxc minifier: peephole/remove_unused_private_members.rs:36",
			"oxc minifier: peephole/remove_unused_private_members.rs:37"
		]
	],
	[
		"oxc drops more unreachable code, as oxc's `peephole/remove_dead_code.rs` tests show",
		[
			"oxc minifier: peephole/remove_dead_code.rs:263",
			"oxc minifier: peephole/remove_dead_code.rs:295"
		]
	],
	[
		"oxc joins more neighboring declarations, as oxc's `peephole/collapse_variable_declarations.rs` tests show",
		[
			"oxc minifier: peephole/collapse_variable_declarations.rs:211",
			"oxc minifier: peephole/collapse_variable_declarations.rs:234",
			"oxc minifier: peephole/collapse_variable_declarations.rs:99"
		]
	],
	[
		"oxc joins and reorders statements to write them shorter, as oxc's `peephole/minimize_statements.rs` tests show",
		["oxc minifier: peephole/minimize_statements.rs:188"]
	],
	[
		"oxc's own integration cases, several transforms combined, as oxc's `peephole/oxc.rs` tests show",
		["oxc minifier: peephole/oxc.rs:23"]
	],
	[
		"oxc inlines a function into its call site, where terser keeps the call",
		[
			"swc minifier: fixture/pr/11987/input.js",
			"terser compress: inline/noinline_annotation_2"
		]
	],
	[
		"oxc writes `switch` statements shorter, or drops them, as oxc's `peephole/minimize_switch_statements.rs` tests show",
		[
			"oxc minifier: peephole/minimize_switch_statements.rs:12",
			"oxc minifier: peephole/minimize_switch_statements.rs:25",
			"oxc minifier: peephole/minimize_switch_statements.rs:32",
			"oxc minifier: peephole/minimize_switch_statements.rs:5"
		]
	],
	[
		"oxc resolves a `switch` on a known value, or writes a `switch` shorter",
		["swc minifier: fixture/issues/10918/input.js"]
	],
	[
		"oxc writes `if` statements shorter, as oxc's `peephole/minimize_if_statement.rs` tests show",
		[
			"oxc minifier: peephole/minimize_if_statement.rs:74",
			"oxc minifier: peephole/minimize_if_statement.rs:78",
			"oxc minifier: peephole/minimize_if_statement.rs:82"
		]
	],
	[
		"oxc folds more constant expressions, as oxc's `peephole/fold_constants.rs` tests show",
		["oxc minifier: peephole/fold_constants.rs:521"]
	],
	[
		'oxc writes more `a["b"]` as `a.b`, as oxc\'s `peephole/convert_to_dotted_properties.rs` tests show',
		[
			"oxc minifier: peephole/convert_to_dotted_properties.rs:24",
			"oxc minifier: peephole/convert_to_dotted_properties.rs:26"
		]
	],
	[
		"oxc aborts: its code generator panics on this source (`crates/oxc_codegen/src/str.rs:712`, a slice out of range)",
		["swc minifier: fixture/issues/string-index-utf16/input.js"]
	],
	[
		"oxc's mangler picks shorter or better-compressing names, as oxc's `mangler/property_mangler.rs` tests show",
		["oxc minifier: mangler/property_mangler.rs:99"]
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
		"oxc's output differs: it drops a name read in a `with` body, which runs the object's `has` trap or getter",
		["oxc minifier: peephole/esbuild.rs:1637"]
	],
	[
		"oxc's output differs: it drops an unused class extending a regular expression, whose definition throws a TypeError",
		["terser compress: harmony/class_extends_regex"]
	],
	[
		"oxc's output is wrong: it renames `LocalCtor` inside a `with` body, so a `LocalCtor` property on the `with` object is no longer used",
		["swc minifier: fixture/issues/11684/with-scope/input.js"]
	],
	[
		"oxc drops an unused `Symbol.for`, which webpack keeps: running it at build time would keep its key in the build's own symbol registry",
		["oxc minifier: ecmascript/may_have_side_effects.rs:1259"]
	],
	[
		"oxc's output is wrong: it renames a `#private` name a direct `eval` reads, so the `eval` throws a SyntaxError",
		["oxc minifier: peephole/remove_unused_private_members.rs:27"]
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
		"oxc's output is wrong: it reads a `let` that a skipped `case` declares as its value, where the input throws a ReferenceError in the binding's dead zone",
		["oxc minifier: peephole/minimize_switch_statements.rs:65"]
	],
	[
		"oxc's output is wrong: it calls a method read through `(0, o.f)`, `(t = o.f)` or an arrow returning it as a method of `o`, and an `eval` so read as a direct `eval`",
		[
			"swc exec: indirect_eval_1",
			"oxc minifier: peephole/oxc.rs:100",
			"oxc minifier: peephole/oxc.rs:101",
			"oxc minifier: peephole/oxc.rs:102",
			"oxc minifier: peephole/oxc.rs:103",
			"oxc minifier: peephole/oxc.rs:104",
			"oxc minifier: peephole/oxc.rs:105",
			"oxc minifier: peephole/oxc.rs:106",
			"oxc minifier: peephole/oxc.rs:107",
			"oxc minifier: peephole/oxc.rs:108",
			"oxc minifier: peephole/remove_unused_expression.rs:592",
			"oxc minifier: peephole/remove_unused_expression.rs:593",
			"oxc minifier: peephole/remove_unused_expression.rs:594",
			"oxc minifier: peephole/remove_unused_expression.rs:595",
			"oxc minifier: peephole/remove_unused_expression.rs:767",
			"oxc minifier: peephole/remove_unused_expression.rs:777",
			"oxc minifier: peephole/remove_unused_expression.rs:787",
			"oxc minifier: peephole/remove_unused_expression.rs:792"
		]
	],
	[
		"oxc reads a global twice as one value, as in `a ? b : a` to `a && b` or `a === null || a === void 0` to `a == null`, where webpack takes a global for a getter that may answer each read anew",
		[
			"oxc minifier: peephole/esbuild.rs:520",
			"oxc minifier: peephole/minimize_conditional_expression.rs:110",
			"oxc minifier: peephole/minimize_conditional_expression.rs:44",
			"oxc minifier: peephole/minimize_conditional_expression.rs:90",
			"oxc minifier: peephole/minimize_conditions.rs:1292",
			"oxc minifier: peephole/minimize_conditions.rs:1293",
			"oxc minifier: peephole/minimize_conditions.rs:1294",
			"oxc minifier: peephole/minimize_conditions.rs:1295",
			"oxc minifier: peephole/minimize_conditions.rs:1296",
			"oxc minifier: peephole/minimize_conditions.rs:1305",
			"oxc minifier: peephole/minimize_conditions.rs:1306",
			"oxc minifier: peephole/minimize_conditions.rs:1307",
			"oxc minifier: peephole/minimize_conditions.rs:1308",
			"oxc minifier: peephole/minimize_conditions.rs:1309",
			"oxc minifier: peephole/minimize_conditions.rs:1310",
			"oxc minifier: peephole/minimize_conditions.rs:1313",
			"oxc minifier: peephole/minimize_conditions.rs:1314",
			"oxc minifier: peephole/minimize_conditions.rs:1315",
			"oxc minifier: peephole/minimize_conditions.rs:1316",
			"oxc minifier: peephole/minimize_conditions.rs:1317",
			"oxc minifier: peephole/minimize_conditions.rs:1318",
			"oxc minifier: peephole/minimize_conditions.rs:1319",
			"oxc minifier: peephole/minimize_conditions.rs:1323",
			"oxc minifier: peephole/oxc.rs:32"
		]
	],
	[
		"oxc's output is wrong: it folds `parseFloat(\"1.e2\")` to 1, which is 100, and writes a regular expression's `toString()` with its flags in the order written, which reads them sorted",
		[
			"oxc minifier: peephole/esbuild.rs:494",
			"oxc minifier: peephole/replace_known_methods.rs:802",
			"oxc minifier: peephole/replace_known_methods.rs:803",
			"oxc minifier: peephole/replace_known_methods.rs:804",
			"oxc minifier: peephole/replace_known_methods.rs:805",
			"oxc minifier: peephole/replace_known_methods.rs:806",
			"oxc minifier: peephole/replace_known_methods.rs:808",
			"oxc minifier: peephole/replace_known_methods.rs:809"
		]
	],
	[
		'oxc converts the operands of `Math.pow` or `"".concat` in another order, writing `a ** +b` or a template, where a getter or `valueOf` of one may see what converting the other did',
		[
			"oxc minifier: peephole/replace_known_methods.rs:1032",
			"oxc minifier: peephole/replace_known_methods.rs:1033",
			"oxc minifier: peephole/replace_known_methods.rs:1043",
			"oxc minifier: peephole/replace_known_methods.rs:1045",
			"oxc minifier: peephole/replace_known_methods.rs:629",
			"oxc minifier: peephole/replace_known_methods.rs:630",
			"oxc minifier: peephole/replace_known_methods.rs:631"
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
		"oxc's output is wrong: it writes `x -= 1` as `--x` and `x -= -1` as `++x` on a name or property that may hold a BigInt, where the input throws a TypeError and the update does not; webpack, like swc, rewrites only a name holding only numbers",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:1638",
			"oxc minifier: ecmascript/value_type.rs:192",
			"oxc minifier: peephole/minimize_conditions.rs:158",
			"oxc minifier: peephole/minimize_conditions.rs:163",
			"oxc minifier: peephole/minimize_conditions.rs:166",
			"oxc minifier: peephole/obscure_edge_cases.rs:222",
			"oxc minifier: peephole/real_world_patterns.rs:79",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:149",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:150"
		]
	]
];

/** @type {Record<string, string>} */
const OXC_SMALLER = {};
for (const [reason, sources] of OXC_SMALLER_BY_REASON) {
	for (const source of sources) OXC_SMALLER[source] = reason;
}

module.exports = OXC_SMALLER;
