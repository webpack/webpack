it("should dispose a chunk which is removed from bundle", (done) => {
	var m1 = require("./module");
	m1.default.then((x1) => {
		NEXT(require("../../update")(done, true, () => {
			var m2 = require("./module");
			m2.default.then((x2) => {
				NEXT(require("../../update")(done, true, () => {
					var m3 = require("./module");
					m3.default.then((x3) => {
						expect(x1).not.toEqual(x2);
						done();
					}).catch(done);
				}));
			}).catch(done);
		}));
	}).catch(done);
});

if(module.hot) {
	module.hot.accept("./module");
}
