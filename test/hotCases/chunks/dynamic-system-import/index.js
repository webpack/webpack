it("should import a changed chunk (dynamic import)", function(done) {
	function load(name) {
		return import("./chunk" + name);
	}
	load(1).then((chunk) => {
		expect(chunk.value).toBe(1);
		NEXT(require("../../update")(done, true, () => {
			expect(chunk.value).toBe(2);
			load(2).then((chunk2) => {
				expect(chunk2.value).toBe(2);
				done();
			}).catch(done);
		}));
	}).catch(done);
});
