import m from "./module";

it("should dispose a chunk which is removed from bundle", (done) => {
	m.then(a => {
		expect(a.default).toEqual("a");
		NEXT(require("../../update")(done, true, () => {
			m.then(b => {
				expect(b.default).toEqual("b");
				done();
			}).catch(done);
		}));
	}).catch(done);
});

if(module.hot) {
	module.hot.accept("./module");
}
