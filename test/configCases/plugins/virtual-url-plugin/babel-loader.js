/** @typedef {import("webpack").LoaderContext<void>} LoaderContext */

/**
 * @this {LoaderContext}
 * @param {string} source The source code to process
 * @returns {void}
 */
module.exports = function(source) {
    const callback = this.async();
  
    try {
      const withoutConst = source.replace(/const/g, "var");
      
      callback(null, withoutConst);
    } catch (err) {
      callback(/** @type {Error} */ (err));
    }
};
  