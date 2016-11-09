module.exports = function(done) {
	return function() {
		module.hot.check(true, function(err) {
			if(err) done(err);
		});
	}
};
