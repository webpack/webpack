module.exports = function(done, options) {
	return function() {
		module.hot.check(options || true).catch(function(err) {
			done(err);
		});
	}
};
