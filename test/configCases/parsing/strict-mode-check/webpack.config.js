"use strict";

/** @type {import("../../../../types").Configuration[]} */
module.exports = (() => {
	/**
	 * Build a data URI JavaScript entry from inline source.
	 * @param {string} code inline JavaScript source
	 * @returns {string} data URI for webpack entry
	 */
	const js = (code) => `data:text/javascript,${encodeURIComponent(code)}`;

	return [
		// warn mode: should build with warnings
		{
			mode: "production",
			output: {
				filename: "[name].bundle0.js"
			},
			entry: {
				// [NOT-A-VIOLATION] 'this' behavior change only (Annex C 10.2.1.2)
				warn_top_this: js("module.exports = this;"),
				// [PLUGIN-WARN] TypeError on access (Annex C 10.4.4.6)
				warn_args_callee: js(
					"function f(){ return arguments.callee } module.exports = f;"
				),
				// [PLUGIN-WARN] Implementation restriction (Annex C last paragraph)
				warn_args_caller: js(
					"function f(){ return arguments.caller } module.exports = f;"
				),
				// [PLUGIN-WARN] Implementation restriction (Annex C last paragraph)
				warn_fn_caller: js("function g(){} module.exports = g.caller;")
			},
			module: {
				parser: {
					javascript: {
						strictModeChecks: "warn"
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
				// [PARSER-ERROR] SyntaxError (Annex C 14.11.1)
				err_with: js("var obj={a:1}; with(obj){ module.exports = a }"),
				// [PARSER-ERROR] SyntaxError on direct reference (Annex C 13.5.1.1)
				err_delete_ident: js("var x=1; delete x; module.exports = x"),
				// [PARSER-ERROR] SyntaxError on duplicate params (Annex C 15.2.1)
				err_dup_params: js("function g(a,a){ return a } module.exports = g"),
				// [PARSER-ERROR] SyntaxError on eval/arguments as BindingIdentifier (Annex C 13.1.1)
				err_reserved_ident: js(
					"var eval=1; function arguments(){} module.exports = eval"
				),
				// [PARSER-ERROR] Must disallow LegacyOctalIntegerLiteral (Annex C paragraph 2)
				err_octal_num: js("module.exports = 0644"),
				// [PARSER-ERROR] Must disallow LegacyOctalEscapeSequence (Annex C paragraph 3)
				err_octal_escape: js('module.exports = \\"\\\\123\\"')
			},
			module: {
				parser: {
					javascript: {
						strictModeChecks: "error"
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
				// [PLUGIN-ERROR] ReferenceError on unresolvable reference (Annex C 6.2.5.6)
				err_assign_undeclared: js("function t(){ x = 1 } module.exports = t"),
				// [PLUGIN-ERROR] TypeError on [[Writable]]: false (Annex C 13.15)
				err_assign_readonly: js("undefined = 1; module.exports = 1"),
				// [PARSER-ERROR] eval as LeftHandSideExpression (Annex C 13.15)
				err_assign_eval: js("eval = 1; module.exports = eval"),
				// [PARSER-ERROR] eval in UpdateExpression (Annex C 13.4)
				err_update_eval: js("eval++; module.exports = 1"),
				// [PARSER-ERROR] SyntaxError on catch(eval/arguments) (Annex C 14.15.1)
				err_catch_arguments: js("try{}catch(arguments){} module.exports = 1")
			},
			module: {
				parser: {
					javascript: {
						strictModeChecks: "error"
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
				// [NO-ERROR] Valid strict mode code
				ok_clean: js("export const x=1; export default x;")
			},
			module: {
				parser: {
					javascript: {
						strictModeChecks: "warn"
					}
				}
			}
		}
	];
})();
