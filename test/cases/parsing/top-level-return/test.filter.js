"use strict";

// eval-based devtools wrap each module body in `eval("{ ... }")`, i.e. a script
// context where a top-level `return` is an "Illegal return statement" at runtime.
// The module runs fine under every non-eval devtool (function-wrapped module).
module.exports = (config) =>
	!(typeof config.devtool === "string" && config.devtool.includes("eval"));
