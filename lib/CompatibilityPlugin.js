/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");

var ModuleAliasPlugin = require("enhanced-resolve/lib/ModuleAliasPlugin");

function CompatibilityPlugin() {
}
module.exports = CompatibilityPlugin;

CompatibilityPlugin.prototype.apply = function(compiler) {
	compiler.resolvers.normal.apply(
		new ModuleAliasPlugin({
			"enhanced-require": path.join(__dirname, "..", "buildin", "return-require.js")
		})
	);
};