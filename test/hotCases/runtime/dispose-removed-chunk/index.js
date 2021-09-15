it("should dispose a chunk which is removed from bundle", (done) => {
	var m1 = require("./module");
	m1.default.then((x1) => {
		expect(x1.default).toEqual("version a1");
		NEXT(require("../../update")(done, true, () => {
			var m2 = require("./module");
			m2.default.then((x2) => {
				expect(x2.default).toEqual("version b1");
				NEXT(require("../../update")(done, true, () => {
					var m3 = require("./module");
					m3.default.then((x3) => {
						expect(x3.default).toEqual("version b2");
						NEXT(require("../../update")(done, true, () => {
							var m4 = require("./module");
							m4.default.then((x4) => {
								expect(x4.default).toEqual("version a2");
								expect(x4).not.toEqual(x1);
								done();
							}).catch(done);
						}));
					}).catch(done);
				}));
			}).catch(done);
		}));
	}).catch(done);
});

if(module.hot) {
	module.hot.accept("./module");
}
