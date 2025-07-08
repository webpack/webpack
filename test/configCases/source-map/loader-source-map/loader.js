const babel = require("@babel/core");

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function(source, inputSourceMap) {
  const callback = this.async();

	babel.transform(source, {
		filename: this.resourcePath,
		sourceFileName: this.resourcePath,
		inputSourceMap: inputSourceMap,
		sourceMaps: this.sourceMap,
		plugins: [function() {
			return {
				visitor: {
					NumericLiteral(path) {
						path.node.value = 43;
					},
				},
			};
		}]
	}, (err, result) => {
		if (err) {
			callback(err);
			return;
		}

		callback(null, result.code, result.map);
	});
};
