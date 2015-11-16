/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var ExternalsPlugin = require("../ExternalsPlugin");

function NodeTargetPlugin() {}

module.exports = NodeTargetPlugin;
NodeTargetPlugin.prototype.apply = function(compiler) {
	new ExternalsPlugin("commonjs", Object.keys(process.binding("natives"))).apply(compiler);
};
