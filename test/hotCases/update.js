module.exports = function(done, options, callback) {
	return function(stats) {
		module.hot.check(options || true).then(function() {
			if(callback)
				callback(stats);
		}).catch(function(err) {
			done(err);
		});
	}
};
