module.exports = function(done) {
	return function() {
		module.hot.check(true).catch(function(err) {
			done(err);
		});
	}
};
