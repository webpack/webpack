module.hot.accept("./chunk");

it("should load a chunk whose id is an Object.prototype key", (done) => {
	import(/* webpackChunkName: "toString" */ "./chunk").then((chunk) => {
		expect(chunk.value).toBe(1);
		NEXT(require("../../update")(done, true, () => {
			import(/* webpackChunkName: "toString" */ "./chunk").then((updated) => {
				expect(updated.value).toBe(2);
				done();
			}).catch(done);
		}));
	}).catch(done);
});
