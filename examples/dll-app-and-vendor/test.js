/**
 * @desc Promise chain config building
 * @see webpack/test/Examples.test.js
 * @param  {Function} webpack compiler call fn
 * @return {Function} function with scoped webpack fn using config to build
 */
function compilerForTest(webpack) {
	/**
	 * @param  {Object} config webpack config obj
	 * @return {Promise} reject when compilation errors
	 */
	return function(config) {
		return new Promise(function(resolve, reject) {
			webpack(config, (err, stats) => {
				if(err) {
					return reject(err);
				}
				stats = stats.toJson({
					errorDetails: true,
				});
				if(stats.errors.length > 0) {
					return reject(new Error(stats.errors[0]));
				}

				return resolve(stats);
			});
		});
	};
}

/**
 * @desc run tests on multi configs with promises
 *       in this case, vendor, then app
 *
 * @see webpack/test/Examples.test.js
 * @param  {Function} done test suite callback
 * @param  {Function} webpack compiler call fn
 * @return {Promise} promisified
 */
function test(done, webpack) {
	var compile = compilerForTest(webpack);
	var vendorConfig = require("./webpack.vendor.config");
	var appConfigPath = require.resolve("./webpack.app.config");

	// run vendor config, if it passes, continue to build app config
	// if either fail, send error to `done`
	return compile(vendorConfig)
		.then(() => {
			// only require here, since it requires the vendor output
			var appConfig = require(appConfigPath);
			compile(appConfig)
				.then(() => done())
				.catch(error => done(error));
		})
		.catch(error => done(error));
}

module.exports = test;
