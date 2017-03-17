var path = require("path");

module.exports = {
	entry: "./test",
	recordsPath: path.resolve(__dirname, "../../../js/config/records/issue-2991/records.json"),
	target: "node",
	node: {
		__dirname: false
	},
	plugins: [
		{
			apply(compiler) {
				compiler.plugin("normal-module-factory", (nmf) => {
					var oldResolve = nmf.resolvers.normal.resolve;
					nmf.resolvers.normal.resolve = function(_, __, resource, callback) {
						if(resource === "foo") {
							callback(null, false, false);
							return;
						}
						return oldResolve.apply(this, arguments);
					};
				});
			}
		}
	]
};
