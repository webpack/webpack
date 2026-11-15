/**
 * @typedef {object} BabelResult
 * @property {string | null=} code transformed code
 * @property {import("webpack-sources").RawSourceMap | null=} map source map
 */

/**
 * @typedef {object} Babel
 * @property {(code: string, options: EXPECTED_OBJECT, callback: (err: Error | null, result: BabelResult | null) => void) => void} transform transforms code
 */

/** @type {import("../../../../").LoaderDefinition} */
module.exports = function (source, inputSourceMap) {
	const callback = this.async();
	const { resourcePath, sourceMap } = this;

	// @babel/core v8 is ESM-only, load it via dynamic import from this CJS loader.
	// The cast keeps tsc from checking babel's own declarations (~530 MB).
	import(/** @type {string} */ ("@babel/core")).then((/** @type {Babel} */ babel) => {
		babel.transform(
			source,
			{
				filename: resourcePath,
				sourceFileName: resourcePath,
				inputSourceMap,
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

				const { code, map } = /** @type {BabelResult} */ (result);

				callback(
					null,
					/** @type {string} */ (code),
					/** @type {import("webpack-sources").RawSourceMap} */ (map)
				);
			}
		);
	}, callback);
};
