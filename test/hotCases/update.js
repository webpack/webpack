module.exports = function(done, options, callback) {
	return function(err, stats) {
		if (err) return done(err);
		module.hot.check(options || true).then(() => {
			if (callback)
				callback(stats);
		}).catch((err) => {
			done(err);
		});
	}
};
