/** @typedef {import("@babel/core").FileResult} BabelFileResult */
/** @typedef {import("@babel/core").InputOptions} TransformOptions */

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source, inputSourceMap) {
	const callback = this.async();
	const { resourcePath, sourceMap } = this;

	// @babel/core v8 is ESM-only, load it via dynamic import from this CJS loader.
	import("@babel/core").then((babel) => {
		babel.transform(
			source,
			{
				filename: resourcePath,
				sourceFileName: resourcePath,
				inputSourceMap:
					/** @type {NonNullable<TransformOptions["inputSourceMap"]>} */ (
						inputSourceMap
					),
				sourceMaps: sourceMap,
				plugins: [
					function () {
						return {
							visitor: {
								/**
								 * @param {EXPECTED_ANY} path path
								 */
								NumericLiteral(path) {
									path.node.value = 43;
								}
							}
						};
					}
				]
			},
			(err, result) => {
				if (err) {
					callback(err);
					return;
				}

				const { code, map } = /** @type {BabelFileResult} */ (result);

				callback(null, /** @type {string} */ (code), JSON.stringify(map));
			}
		);
	}, callback);
};
