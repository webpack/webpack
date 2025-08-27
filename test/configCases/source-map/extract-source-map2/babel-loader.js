/** @typedef {import("webpack").LoaderContext<void>} LoaderContext */

const assert = require("assert")

/**
 * @this {LoaderContext}
 * @param {string} source The source code to process
 * @param {import("webpack-sources").RawSourceMap} sourceMap The source map to process
 * @returns {void}
 */
module.exports = function(source, sourceMap) {
    const callback = this.async();
    const resourcePath = this.resourcePath;

    if (resourcePath.endsWith("a.js")) {
      assert(sourceMap && sourceMap.version && sourceMap.mappings, "should have source map when extract source map");
    }
  
    try {
      const withoutConst = source.replace(/const/g, "var");
      
      callback(null, withoutConst, sourceMap);
    } catch (err) {
      callback(/** @type {Error} */ (err));
    }
};
  