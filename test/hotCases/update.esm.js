export default function update(done, options, callback) {
	return function (err, stats) {
		if (err) return done(err);
		import.meta.webpackHot
			.check(options || true)
			.then(updatedModules => {
				if (!updatedModules) {
					// A client sharing the output that loaded a chunk of the new build has
					// already caught up to it by itself.
					if (stats && stats.hash === __webpack_hash__) {
						if (callback) callback(stats);
						return;
					}
					return done(new Error("No update available"));
				}
				if (callback) callback(stats);
			})
			.catch(err => {
				done(err);
			});
	};
};
