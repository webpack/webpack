/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ExternalsPlugin = require("../ExternalsPlugin");

const builtins =
	// @ts-ignore https://github.com/DefinitelyTyped/DefinitelyTyped/pull/24521
require("module").builtinModules || Object.keys(process.binding("natives"));

class NodeTargetPlugin {
	apply(compiler) {
		new ExternalsPlugin("commonjs", builtins).apply(compiler);
	}
}

module.exports = NodeTargetPlugin;
