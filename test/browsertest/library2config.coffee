webpack = require("../../");
exports.default = new Promise (resolve, reject) ->
	resolveIt = ->
		resolve
			entry:
				common: "library2/lib/common"
			output:
				hashDigestLength: 5
			module:
				postLoaders: [
					{ test: /extra2?\.js/, loader: "raw!extra!val?cacheable" }
				]
			amd:
				fromOptions: true
			resolve:
				# cannot resolve should outside the outermost node_modules
				# so it is injected here
				alias:
					should: require.resolve "should"
			plugins: [
				new webpack.optimize.LimitChunkCountPlugin
					maxChunks: 2
				new webpack.optimize.CommonsChunkPlugin
					name: "common"
					filename: "library2.commons.js"
				new webpack.DefinePlugin
					"typeof CONST_TYPEOF": JSON.stringify("typeof"),
					CONST_UNDEFINED: undefined,
					CONST_NULL: "null",
					CONST_TRUE: true,
					CONST_FALSE: false,
					CONST_FUNCTION: -> return "ok";
					CONST_NUMBER: 123,
					CONST_NUMBER_EXPR: "(1*100+23)",
					CONST_OBJECT: {
						A: 1,
						B: JSON.stringify("B"),
						C: -> return "C";
					}
				new webpack.ProvidePlugin
					s3: "submodule3"
				->
					this.plugin "normal-module-factory", (nmf) ->
						nmf.plugin "after-resolve", (data, callback) ->
							data.resource = data.resource.replace /extra\.js/, "extra2.js";
							callback null, data;
			]
	setTimeout resolveIt, 300
