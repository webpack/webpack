const babel = require("@babel/core");

/** @typedef {import("@babel/core").BabelFileResult} BabelFileResult */
/** @typedef {import("@babel/core").TransformOptions} TransformOptions */

/** @typedef {import("estree").SimpleLiteral} SimpleLiteral */

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function(source, inputSourceMap) {
  const callback = this.async();

	babel.transform(source, {
		filename: this.resourcePath,
		sourceFileName: this.resourcePath,
		inputSourceMap: /** @type {NonNullable<TransformOptions["inputSourceMap"]>} */
			(inputSourceMap),
		sourceMaps: this.sourceMap,
		plugins: [function() {
			return {
				visitor: {
					/**
					 * @param {EXPECTED_ANY} path path
					 */
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

		const { code, map } = /** @type {BabelFileResult} */ (result);

		callback(null, /** @type {string} */ (code), map);
	});
};
