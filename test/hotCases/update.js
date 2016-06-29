module.exports = function(done, options, callback) {
	return function() {
		module.hot.check(options || true).then(callback || function() {}).catch(function(err) {
			done(err);
		});
	}
};
