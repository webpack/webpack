it("should import a changed chunk", (done) => {
	import("./chunk").then((chunk) => {
		expect(chunk.value).toBe(1);
		expect(chunk.value2).toBe(3);
		expect(chunk.counter).toBe(0);
		NEXT(require("../../update")(done, true, () => {
			expect(chunk.value).toBe(2);
			expect(chunk.value2).toBe(4);
			expect(chunk.counter).toBe(1);
			import("./chunk2").then(function(chunk2) {
				expect(chunk2.value).toBe(2);
				expect(chunk2.value2).toBe(4);
				expect(chunk2.counter).toBe(0);
				done();
			}).catch(done);
		}));
	}).catch(done);
});
