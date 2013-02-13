/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Compiler = require("./Compiler");
var NodeEnvironmentPlugin = require("./node/NodeEnvironmentPlugin");
var WebpackOptionsApply = require("./WebpackOptionsApply");
var WebpackOptionsDefaulter = require("./WebpackOptionsDefaulter");

function webpack(options, callback) {
	new WebpackOptionsDefaulter().process(options);

	var compiler = new Compiler();
	compiler.options = options;
	compiler.options = new WebpackOptionsApply().process(options, compiler);
	new NodeEnvironmentPlugin(options.separate).apply(compiler);
	if(callback) {
		if(options.watch) {
			return compiler.watch(options.watchDelay, callback);
		} else {
			compiler.run(callback);
		}
	}
	return compiler;
}
module.exports = webpack;

webpack.WebpackOptionsDefaulter = WebpackOptionsDefaulter;
webpack.WebpackOptionsApply = WebpackOptionsApply;
webpack.Compiler = Compiler;
webpack.NodeEnvironmentPlugin = NodeEnvironmentPlugin;
