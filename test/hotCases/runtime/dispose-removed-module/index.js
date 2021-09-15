var m = require("./module");

it("should dispose a module which is removed from bundle", (done) => {
	var disposed = [];
	m.setHandler((id) => {
		disposed.push(id);
	});
	NEXT(require("../../update")(done, true, () => {
		require("./module");
		NEXT(require("../../update")(done, true, () => {
			var newModule = require("./module");
			expect(disposed).toEqual([newModule.default]);
			done();
		}));
	}));
});

if(module.hot) {
	module.hot.accept("./module");
}
