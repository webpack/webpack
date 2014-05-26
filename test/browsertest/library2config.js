var webpack = require("../../");
module.exports = {
	output: {
		hashDigestLength: 5
	},
	module: {
		postLoaders: [
			{ test: /extra2?\.js/, loader: "raw!extra!val?cacheable" }
		]
	},
	amd: {
		fromOptions: true
	},
	resolve: {
		// cannot resolve should outside the outermost node_modules
		// so it is injected here
		alias: { should: require.resolve("should") }
	},
	plugins: [
		new webpack.optimize.LimitChunkCountPlugin(2),
		new webpack.DefinePlugin({
			"typeof CONST_TYPEOF": JSON.stringify("typeof"),
			CONST_UNDEFINED: undefined,
			CONST_NULL: null,
			CONST_TRUE: true,
			CONST_FALSE: false,
			CONST_FUNCTION: function() { return "ok"; },
			CONST_NUMBER: 123,
			CONST_NUMBER_EXPR: "1*100+23",
			CONST_OBJECT: {
				A: 1,
				B: JSON.stringify("B"),
				C: function() { return "C"; }
			}
		}),
		new webpack.ProvidePlugin({
			s3: "submodule3"
		}),
		function() {
			this.plugin("normal-module-factory", function(nmf) {
				nmf.plugin("after-resolve", function(data, callback) {
					data.resource = data.resource.replace(/extra\.js/, "extra2.js");
					callback(null, data);
				});
			});
		}
	]
}