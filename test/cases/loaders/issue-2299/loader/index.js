var path = require('path');
var async = require('async');
module.exports = function(content) {
	var cb = this.async();
	var json = JSON.parse(content);
	async.mapSeries(
		json.imports,
		function(url, callback) {
			this.loadModule(url, function(err, source, map, module) {
				if (err) {
					return callback(err);
				}
				callback(null, this.exec(source, url));
			}.bind(this))
		}.bind(this),
		function(err, results) {
			if (err) {
				return cb(err);
			}
			// Combine all the results into one object and return it
			cb(null, 'module.exports = ' + JSON.stringify(results.reduce(function(prev, result) {
				for (var key in result) {
					if (result.hasOwnProperty(key)) {
						prev[key] = result[key];
					}
				}
				return prev;
			}, json)));
		}
	);
}
