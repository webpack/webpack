module.exports = function (done) {
	return function (err, stats) {
		if (err) return done(err);
		module.hot
			.check(false)
			.then(updatedModules => {
				if (!updatedModules) return done(new Error("No update available"));
				expect(updatedModules).toContain("./file.js");
				done();
			})
			.catch(err => {
				done(err);
			});
	};
};
