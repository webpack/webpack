"use strict";

// cspell:ignore autowhatever chartjs concattenating constdef defun dont elad expname funs hoofd instancesearch mangleprop mangleprops noinline nonmatching plotly propmangle redef

// What oxc's minifier does that webpack's does not yet, each with the sources
// whose output under the default minimizer's options is bigger than oxc's.
// Biggest group first: retire a source once it is no longer bigger.

/** @type {[string, string[]][]} */
const OXC_SMALLER_BY_REASON = [
	[
		"mangled-name choice: the same program with other mangled names, or one name given to other bindings",
		[
			"oxc minifier: peephole/dead_code_elimination.rs:899",
			"oxc minifier: peephole/fold_constants.rs:1360",
			"oxc minifier: peephole/inline_single_use_variable.rs:359",
			"oxc minifier: peephole/remove_unused_expression.rs:1030",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:1086",
			"swc exec: issue_10095",
			"swc exec: issue_8864_1",
			"swc exec: terser_issue_t292_no_flatten_with_arg_colliding_with_arg_value_inner_scope",
			"swc minifier: fixture/issues/12186/nested-bitwise/input.js",
			"swc minifier: fixture/issues/12311/input.js",
			"swc minifier: fixture/issues/6636/input.js",
			"swc minifier: fixture/issues/8324/input.js",
			"swc minifier: fixture/issues/object-accessor-function-boundary/input.js",
			"swc minifier: fixture/projects/backbone/7/input.js",
			"swc minifier: fixture/projects/mootools/4/input.js",
			"swc minifier: fixture/projects/react/3/input.js",
			"terser compress: async/for_await_of",
			"terser compress: async/for_await_of_2",
			"terser compress: class-properties/private_properties_can_be_mangled",
			"terser compress: collapse_vars/issue_2313_1",
			"terser compress: drop-unused/class_used_within_itself_7_var_expname",
			"terser compress: harmony/format_methods",
			"terser compress: issue-t292/no_flatten_with_arg_colliding_with_arg_value_inner_scope",
			"terser compress: issue_1014/ternary_and_private_methods",
			"terser compress: reduce_vars/issue_3140_1",
			"terser compress: sequences/issue_2313",
			"terser compress: transform/if_return"
		]
	],
	[
		"inlining: a function, a call in place or a single-use value written where it is used by one side and kept apart by the other",
		[
			"oxc minifier: peephole/inline.rs:314",
			"oxc minifier: peephole/inline_single_use_variable.rs:47",
			"oxc minifier: peephole/inline_single_use_variable.rs:80",
			"swc exec: issue_6899_1",
			"swc exec: issue_6899_2",
			"swc exec: terser_async_async_inline",
			"swc exec: terser_drop_unused_issue_t183",
			"swc exec: terser_reduce_vars_chained_assignments",
			"swc exec: terser_reduce_vars_unsafe_evaluate_side_effect_free_1",
			"swc minifier: fixture/issues/12188/input.js",
			"swc minifier: fixture/reduced/1/input.js",
			"swc minifier: pass-1/compute/1/input.js",
			"swc minifier: pass-default/compute/1/input.js",
			"terser compress: async/async_inline",
			"terser compress: blocks/issue_1664",
			"terser compress: collapse_vars/collapse_vars_array",
			"terser compress: collapse_vars/collapse_vars_object",
			"terser compress: drop-unused/issue_t183",
			"terser compress: functions/unsafe_apply_2",
			"terser compress: functions/unsafe_call_2",
			"terser compress: inline/dont_inline_funcs_into_default_param_2",
			"terser compress: properties/skip_computed_properties",
			"terser compress: reduce_vars/chained_assignments",
			"terser compress: reduce_vars/unsafe_evaluate_side_effect_free_1",
			"terser compress: template-string/side_effects",
			"terser input: source-maps/expect.js",
			"terser input: source-maps/input.js"
		]
	],
	[
		"`,` vs `;` statements: the same statements joined into one sequence where the rival writes them apart, or a sequence's expressions lifted out or kept in another order",
		[
			"oxc minifier: peephole/minimize_conditions.rs:1405",
			"oxc minifier: peephole/remove_unused_expression.rs:1269",
			"swc minifier: fixture/issues/11684/nested-eval/input.js",
			"swc minifier: fixture/issues/2078/1/input.js",
			"swc minifier: fixture/issues/6864/input.js",
			"swc minifier: fixture/projects/jquery/18/input.js",
			"swc minifier: fixture/projects/next/extra/if_return/.4/input.js",
			"swc minifier: full/size/54531ba076299b43c00a0d234240369f93371a41/input.js",
			"terser compress: arrow/arrow_binding_pattern",
			"terser compress: inline/inline_into_scope_conflict_enclosed",
			"terser compress: inline/inline_into_scope_conflict_enclosed_2",
			"terser compress: reduce_vars/issue_2440_with_1",
			"terser compress: reduce_vars/issue_2440_with_2",
			"terser compress: sequences/lift_sequences_1",
			"terser compress: sequences/lift_sequences_2",
			"terser compress: yield/yield_before_punctuators"
		]
	],
	[
		"properties set right after an object literal: webpack writes them into the literal where oxc keeps the assignments after it",
		[
			"swc exec: terser_issue_1321_issue_1321_debug",
			"swc exec: terser_issue_1321_issue_1321_no_debug",
			"swc exec: terser_issue_1321_issue_1321_with_quoted",
			"swc exec: terser_properties_join_object_assignments_2",
			"swc exec: terser_properties_join_object_assignments_regex",
			"swc exec: terser_properties_join_object_assignments_undefined_1",
			"swc exec: terser_properties_join_object_assignments_undefined_2",
			"swc exec: terser_properties_join_object_assignments_void_0",
			"terser compress: class-properties/class_expression_constant",
			"terser compress: issue-1321/issue_1321_debug",
			"terser compress: issue-1321/issue_1321_no_debug",
			"terser compress: issue-1321/issue_1321_with_quoted",
			"terser compress: properties/join_object_assignments_2",
			"terser compress: properties/join_object_assignments_regex",
			"terser compress: properties/join_object_assignments_undefined_1",
			"terser compress: properties/join_object_assignments_undefined_2",
			"terser compress: properties/join_object_assignments_void_0"
		]
	],
	[
		"method vs arrow: webpack writes an object's function property as the shorter `a:()=>x` where oxc writes the method `a(){return x}`, or keeps a `function` swc writes as an arrow",
		[
			"swc minifier: fixture/issues/12191/empty-pattern-iterator/input.js",
			"swc minifier: fixture/issues/12191/iterator-errors/input.js",
			"swc minifier: fixture/issues/12213/shadowed-object/input.js",
			"swc minifier: fixture/issues/12218/dynamic-spread/input.js",
			"swc minifier: fixture/issues/9186/1/input.js",
			"terser compress: arrow/async_object_literal",
			"terser compress: arrow/export_default_object_expression",
			"terser compress: arrow/issue_3092b",
			"terser compress: harmony/export_default_object_expression",
			"terser compress: mangleprops-mangleprop-annotation/mangleprop_annotation",
			"terser compress: object/concise_methods_with_various_property_names",
			"terser compress: object/getter_setter",
			"terser compress: properties/issue_2208_8"
		]
	],
	[
		"boolean and conditional forms: `!a&&b` vs `a?!1:b`, `!!a` vs `a&&!0`, `x||void 0` vs `if(x)`, an `if` with or without braces, a test's branches swapped",
		[
			"oxc minifier: peephole/minimize_conditions.rs:113",
			"oxc minifier: peephole/minimize_exit_points.rs:375",
			"swc minifier: fixture/projects/backbone/15/input.js",
			"swc minifier: fixture/projects/jquery/2/input.js",
			"swc minifier: fixture/projects/jquery/3/input.js",
			"terser compress: collapse_vars/issue_2878",
			"terser compress: conditionals/cond_9",
			"terser compress: reduce_vars/escape_await"
		]
	],
	[
		"constant folding: webpack writes a computed value (a string, `NaN`, an element) where the rival keeps the expression that makes it",
		[
			"swc minifier: fixture/issues/number-radix-conversion/input.js",
			"terser compress: harmony/array_literal_with_spread_2b",
			"terser compress: harmony/array_literal_with_spread_4a",
			"terser compress: harmony/issue_2345",
			"terser compress: ie8/do_screw_try_catch_undefined",
			"terser compress: ie8/dont_screw_try_catch_undefined",
			"terser compress: issue-597/beautify_off_1",
			"terser compress: issue-597/beautify_on_1",
			"terser compress: template-string/template_string_with_predefined_constants",
			"terser compress: unicode/issue_2242_3",
			"terser compress: unicode/issue_2242_4"
		]
	],
	[
		"`if…return` chain vs `?:…void 0`: webpack folds the returns into one `return a?b:c?d:void 0` where the rival keeps `if(a)return b;if(c)return d`",
		[
			"oxc minifier: peephole/esbuild.rs:688",
			"oxc minifier: peephole/minimize_statements.rs:195",
			"terser compress: if_return/if_return_2",
			"terser compress: if_return/if_return_4",
			"terser compress: if_return/if_return_8",
			"terser compress: if_return/if_var_return",
			"terser compress: if_return/issue_1437",
			"terser compress: if_return/issue_1437_conditionals",
			"terser compress: return_undefined/return_undefined"
		]
	],
	[
		"where a declaration goes: a `let`, `var` or function declaration placed earlier or later, or its first value assigned apart",
		[
			"swc exec: terser_drop_unused_drop_var",
			"swc minifier: fixture/issues/12182/receiver-sensitive/input.js",
			"swc minifier: fixture/projects/backbone/12/input.js",
			"swc minifier: fixture/projects/backbone/16/input.js",
			"terser compress: drop-unused/drop_var",
			"terser compress: evaluate/and",
			"terser compress: functions/hoist_funs_strict"
		]
	],
	[
		"`void 0` vs a name known to hold `undefined`: webpack writes `void 0` where the rival reads a binding nothing assigned, or the reverse",
		[
			"oxc minifier: peephole/inline.rs:658",
			"terser compress: issue-1733/function_catch_catch",
			"terser compress: issue-1733/function_catch_catch_ie8",
			"terser compress: reduce_vars/try_abort",
			"terser compress: rename/function_catch_catch",
			"terser compress: rename/function_catch_catch_ie8"
		]
	],
	[
		"block scoping: a block of `let` declarations kept where the rival flattens it, renaming the names it would shadow, or the reverse",
		[
			"swc exec: terser_issue_1466_different_variable_in_multiple_for_in",
			"terser compress: issue-1466/different_variable_in_multiple_forIn"
		]
	],
	[
		"a dead read or write: one side keeps a statement only reading a name, a parameter nothing reads or a write nothing reads that the other drops",
		["swc minifier: fixture/issues/12209/input.js"]
	],
	[
		"a shorter operator oxc writes: `**` for `Math.pow` of numbers",
		["terser compress: evaluate/issue_2207_1"]
	],
	[
		"unused constructor: webpack drops an empty constructor the rival keeps",
		["terser compress: harmony/classes"]
	],
	[
		"deflate's header: the program is no longer raw, yet gzips 1 to 3 bytes bigger, as the Huffman codes deflate writes for a small program cost more or less with which characters it holds (an operand's side, `let` or `const`, `NaN` or `0/0`, a backtick or a quote); measured corpus-wide, no fixed spelling rule wins, each one making about as many programs bigger as smaller",
		["terser compress: conditionals/issue_2560"]
	],
	[
		"oxc applies esbuild's shortenings, as oxc's `peephole/esbuild.rs` tests show",
		[
			"oxc minifier: peephole/esbuild.rs:1215",
			"oxc minifier: peephole/esbuild.rs:1222",
			"oxc minifier: peephole/esbuild.rs:1798",
			"oxc minifier: peephole/esbuild.rs:2309",
			"oxc minifier: peephole/esbuild.rs:255"
		]
	],
	[
		"webpack writes the same program in a spelling longer or compressing worse than oxc's",
		[
			"swc minifier: pass-1/uiw-codemirror/input.js",
			"terser compress: big_int/big_int_math_counter_examples",
			"terser compress: evaluate/or",
			"swc exec: terser_arguments_modified",
			"swc minifier: fixture/issues/10412/input.js",
			"swc minifier: fixture/issues/10885/input.js",
			"swc minifier: fixture/issues/11368/input.js",
			"swc minifier: fixture/issues/11684/identifier-preserved/input.js",
			"swc minifier: fixture/issues/11684/scopes-and-mutations/input.js",
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
			"terser compress: evaluate/unsafe_array",
			"terser compress: evaluate/unsafe_integer_key",
			"terser compress: export/issue_2038_2",
			"terser compress: export/name_cache_import_star_as_name_from_module",
			"terser compress: issue-973/this_binding_sequences",
			"terser compress: new/new_statements_3",
			"terser compress: numbers/evaluate_1",
			"terser compress: numbers/evaluate_2",
			"terser compress: reduce_vars/multi_def_2",
			"oxc minifier: peephole/minimize_statements.rs:32",
			"swc minifier: fixture/projects/yui/13/input.js",
			"terser compress: collapse_vars/collapse_rhs_conditional_2"
		]
	],
	[
		"oxc substitutes shorter syntax, as oxc's `peephole/substitute_alternate_syntax.rs` tests show",
		[
			"oxc minifier: peephole/substitute_alternate_syntax.rs:135",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:164",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:165",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:168",
			"oxc minifier: peephole/substitute_alternate_syntax.rs:169"
		]
	],
	[
		"oxc drops what nothing reads or what has no effect: unused variables, functions, parameters and pure expressions",
		[
			"terser compress: drop-unused/issue_1715_3",
			"terser compress: reduce_vars/issue_t1382",
			"terser compress: template-string/tagged_template_with_comment",
			"terser compress: typescript/typescript_disabled_interface"
		]
	],
	[
		"oxc knows more expressions have no side effects and drops them when their value is unused, as oxc's `ecmascript/may_have_side_effects.rs` tests show",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:1300",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1365",
			"oxc minifier: ecmascript/may_have_side_effects.rs:783",
			"oxc minifier: ecmascript/may_have_side_effects.rs:907"
		]
	],
	[
		"oxc writes conditions shorter, as oxc's `peephole/minimize_conditions.rs` tests show",
		[
			"oxc minifier: peephole/minimize_conditions.rs:1066",
			"oxc minifier: peephole/minimize_conditions.rs:223"
		]
	],
	[
		"real-world code, where the gap sums several of the transforms above; split it once those land",
		[
			"swc minifier: fixture/issues/d3-color/1/input.js",
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
			"terser compress: sequences/lift_sequences_3",
			"swc minifier: fixture/issues/framer-motion/1/input.js"
		]
	],
	[
		"oxc drops more unused expressions, as oxc's `peephole/remove_unused_expression.rs` tests show",
		[
			"oxc minifier: peephole/remove_unused_expression.rs:1169",
			"oxc minifier: peephole/remove_unused_expression.rs:514"
		]
	],
	[
		"oxc drops more dead code, as oxc's `peephole/dead_code_elimination.rs` tests show",
		[
			"oxc minifier: peephole/dead_code_elimination.rs:613",
			"oxc minifier: peephole/dead_code_elimination.rs:618",
			"oxc minifier: peephole/dead_code_elimination.rs:623",
			"oxc minifier: peephole/dead_code_elimination.rs:629",
			"oxc minifier: peephole/dead_code_elimination.rs:711",
			"oxc minifier: peephole/dead_code_elimination.rs:716",
			"oxc minifier: peephole/dead_code_elimination.rs:726",
			"oxc minifier: peephole/dead_code_elimination.rs:731",
			"oxc minifier: peephole/dead_code_elimination.rs:736"
		]
	],
	[
		"oxc drops more unused declarations, as oxc's `peephole/remove_unused_declaration.rs` tests show",
		["oxc minifier: peephole/remove_unused_declaration.rs:181"]
	],
	[
		"oxc's mangler picks shorter or better-compressing names",
		[
			"swc minifier: fixture/issues/11645/with-parent-scope-nested-block/input.js",
			"swc minifier: fixture/projects/react/15/input.js",
			"swc minifier: fixture/projects/mootools/8/input.js",
			"swc minifier: fixture/projects/yui/1/input.js"
		]
	],
	[
		"oxc normalizes the syntax before compressing it, as oxc's `peephole/normalize.rs` tests show",
		[
			"oxc minifier: peephole/normalize.rs:230",
			"oxc minifier: peephole/normalize.rs:274"
		]
	],
	[
		"oxc writes a variable's value at its one read and drops the variable, or an alias of another binding",
		[
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
			"swc minifier: fixture/projects/backbone/5/input.js",
			"swc minifier: fixture/projects/react/16/input.js"
		]
	],
	[
		"oxc drops a redundant last `return`, `break` or `continue`, as oxc's `peephole/minimize_exit_points.rs` tests show",
		["oxc minifier: peephole/minimize_exit_points.rs:178"]
	],
	[
		"oxc picks shorter spellings for comparisons, coercions and literals",
		[
			"swc minifier: fixture/issues/11082/input.js",
			"swc minifier: fixture/projects/backbone/2/input.js",
			"swc minifier: fixture/issues/10720/input.js",
			"swc minifier: fixture/issues/12194/input.js"
		]
	],
	[
		"oxc evaluates built-in calls and reads on literals at build time",
		["terser compress: issue-126/concatenate_rhs_strings"]
	],
	[
		"oxc writes classes, methods and object literals shorter",
		["swc exec: object_spread_proto_key_is_not_flattened"]
	],
	[
		"oxc writes a variable's value at its one read and drops the variable, as oxc's `peephole/inline_single_use_variable.rs` tests show",
		[
			"oxc minifier: peephole/inline_single_use_variable.rs:282",
			"oxc minifier: peephole/inline_single_use_variable.rs:411"
		]
	],
	[
		"oxc folds arithmetic, comparisons and concatenation of constants",
		[
			"terser compress: const/issue_1396",
			"terser compress: destructuring/empty_object_destructuring_misc"
		]
	],
	[
		"oxc inlines more constants and functions, as oxc's `peephole/inline.rs` tests show",
		[
			"oxc minifier: peephole/inline.rs:698",
			"oxc minifier: peephole/inline.rs:703",
			"oxc minifier: peephole/inline.rs:704",
			"oxc minifier: peephole/inline.rs:642"
		]
	],
	[
		"oxc drops more unreachable code, as oxc's `peephole/remove_dead_code.rs` tests show",
		["oxc minifier: peephole/remove_dead_code.rs:263"]
	],
	[
		"oxc's own integration cases, several transforms combined, as oxc's `peephole/oxc.rs` tests show",
		["oxc minifier: peephole/oxc.rs:23"]
	],
	[
		"oxc inlines a function into its call site, where terser keeps the call",
		["terser compress: inline/noinline_annotation_2"]
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
		"oxc drops an unused `Symbol.for`, which webpack keeps: running it at build time would keep its key in the build's own symbol registry",
		[
			"oxc minifier: ecmascript/may_have_side_effects.rs:1259",
			"oxc minifier: ecmascript/may_have_side_effects.rs:1404"
		]
	],
	[
		"oxc's output is wrong: it renames `slot` inside a `with` body, so a `slot` property on the `with` object is no longer called",
		["oxc minifier: peephole/dead_code_elimination.rs:860"]
	],
	[
		"oxc's output is wrong: it renames a `#private` name a direct `eval` reads, so the `eval` throws a SyntaxError",
		["oxc minifier: peephole/remove_unused_private_members.rs:27"]
	],
	[
		"oxc's output is wrong: it drops a write in a `for…of` or `for…in` right side to the loop's own `let`, which throws a ReferenceError there, as its own test keeps it",
		[
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:106",
			"oxc minifier: peephole/merge_assignments_to_declarations.rs:107"
		]
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
			"oxc minifier: peephole/remove_unused_expression.rs:772",
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
		"oxc's output is wrong: it folds a property read into a tag, as in `let c = a.b; return c``` to `a.b```, which calls the tag as a method of `a`",
		[
			"oxc minifier: peephole/esbuild.rs:1332",
			"oxc minifier: peephole/esbuild.rs:1333",
			"oxc minifier: peephole/inline_single_use_variable.rs:324",
			"oxc minifier: peephole/inline_single_use_variable.rs:325"
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
			"oxc minifier: peephole/oxc.rs:32",
			"terser compress: nullish/conditional_to_nullish_coalescing_2"
		]
	],
	[
		'oxc\'s output is wrong: it folds `parseFloat("1.e2")` to 1, which is 100',
		[
			"oxc minifier: peephole/replace_known_methods.rs:796",
			"oxc minifier: peephole/replace_known_methods.rs:797",
			"oxc minifier: peephole/replace_known_methods.rs:798",
			"oxc minifier: peephole/replace_known_methods.rs:799",
			"oxc minifier: peephole/replace_known_methods.rs:800",
			"oxc minifier: peephole/replace_known_methods.rs:802",
			"oxc minifier: peephole/replace_known_methods.rs:803"
		]
	],
	[
		'oxc converts the operands of `Math.pow` or `"".concat` in another order, writing `a ** +b` or a template, where a getter or `valueOf` of one may see what converting the other did',
		[
			"oxc minifier: peephole/replace_known_methods.rs:1026",
			"oxc minifier: peephole/replace_known_methods.rs:1027",
			"oxc minifier: peephole/replace_known_methods.rs:1037",
			"oxc minifier: peephole/replace_known_methods.rs:1039",
			"oxc minifier: peephole/replace_known_methods.rs:610",
			"oxc minifier: peephole/replace_known_methods.rs:611",
			"oxc minifier: peephole/replace_known_methods.rs:612"
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
