const TargetNodePlugin = require("../../../../lib/target/TargetNodePlugin");
const { RawSource } = require("webpack-sources");

module.exports = {
	target: compiler => {
		new TargetNodePlugin({ ...compiler.options, target: "node" }).apply(
			compiler
		);
		compiler.hooks.emit.tap("plugin", compilation => {
			compilation.assets["foo.js"] = new RawSource("bar");
		});
	},
	node: {
		__dirname: false
	}
};
