var asyncLib = require("neo-async");
module.exports = function(content) {
	var cb = this.async();
	var json = JSON.parse(content);
	asyncLib.mapSeries(
		json.imports,
		function(url, callback) {
			this.loadModule(url, function(err, source, map, module) {
				if (err) {
					return callback(err);
				}
				callback(null, JSON.parse(source));
			});
		}.bind(this),
		function(err, results) {
			if (err) {
				return cb(err);
			}
			// Combine all the results into one object and return it
			cb(
				null,
				"module.exports = " +
					JSON.stringify(
						results.reduce(function(prev, result) {
							return { ...prev, ...result };
						}, json)
					)
			);
		}
	);
};
