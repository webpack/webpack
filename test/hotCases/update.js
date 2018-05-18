module.exports = function(done, options, callback) {
	return function(stats) {
		module.hot.check(options || true).then(() => {
			if(callback)
				callback(stats);
		}).catch((err) => {
			done(err);
		});
	}
};
