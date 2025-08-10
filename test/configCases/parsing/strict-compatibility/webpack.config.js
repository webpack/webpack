"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = (() => {
	const js = (code) => `data:text/javascript,${encodeURIComponent(code)}`;

	return [
		// warn mode: should build with warnings
		{
			mode: "production",
			output: {
				filename: "[name].bundle0.js"
			},
			entry: {
				// top-level this becomes undefined in strict mode
				warn_top_this: js("module.exports = this;"),
				// arguments.callee is forbidden in strict mode (runtime TypeError)
				warn_args_callee: js(
					"function f(){ return arguments.callee } module.exports = f;"
				),
				// arguments.caller is restricted in strict mode (runtime TypeError)
				warn_args_caller: js(
					"function f(){ return arguments.caller } module.exports = f;"
				),
				// Accessing Function#caller is restricted in strict mode
				warn_fn_caller: js("function g(){} module.exports = g.caller;")
			},
			module: {
				parser: {
					javascript: {
						strictCompatibility: "warn"
					}
				}
			}
		},
		// error mode (syntax): should fail on syntax-incompatible patterns
		{
			mode: "production",
			output: {
				filename: "[name].bundle0.js"
			},
			entry: {
				// with statement is forbidden in strict mode
				err_with: js("var obj={a:1}; with(obj){ module.exports = a }"),
				// delete on unqualified identifier is SyntaxError in strict mode
				err_delete_ident: js("var x=1; delete x; module.exports = x"),
				// duplicate function parameters are SyntaxError in strict mode
				err_dup_params: js("function g(a,a){ return a } module.exports = g"),
				// using eval/arguments as identifiers is SyntaxError in strict mode
				err_reserved_ident: js(
					"var eval=1; function arguments(){} module.exports = eval"
				),
				// legacy octal numeric literal is not allowed in strict mode
				err_octal_num: js("module.exports = 0644"),
				// legacy octal escape in string is not allowed in strict mode
				err_octal_escape: js('module.exports = \\"\\\\123\\"')
			},
			module: {
				parser: {
					javascript: {
						strictCompatibility: "error"
					}
				}
			}
		},
		// error mode (semantic): should fail on plugin-detected strict-only errors
		{
			mode: "production",
			output: {
				filename: "[name].bundle0.js"
			},
			entry: {
				// assignment to undeclared identifier -> ReferenceError in strict mode
				err_assign_undeclared: js("function t(){ x = 1 } module.exports = t"),
				// assignment to read-only global 'undefined'
				err_assign_readonly: js("undefined = 1; module.exports = 1"),
				// assignment to 'eval' is not allowed in strict mode
				err_assign_eval: js("eval = 1; module.exports = eval"),
				// update expression on 'eval' is not allowed in strict mode
				err_update_eval: js("eval++; module.exports = 1"),
				// catch parameter named 'arguments' is not allowed in strict mode
				err_catch_arguments: js("try{}catch(arguments){} module.exports = 1")
			},
			module: {
				parser: {
					javascript: {
						strictCompatibility: "error"
					}
				}
			}
		},
		// control case: clean module should pass with no diagnostics
		{
			mode: "production",
			output: {
				filename: "[name].bundle0.js"
			},
			entry: {
				ok_clean: js("export const x=1; export default x;")
			},
			module: {
				parser: {
					javascript: {
						strictCompatibility: "warn"
					}
				}
			}
		}
	];
})();
