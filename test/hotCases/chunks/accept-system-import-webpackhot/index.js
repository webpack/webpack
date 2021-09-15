it("should import a changed chunk", (done) => {
	import("./chunk").then((chunk) => {
		expect(chunk.value).toBe(1);
		import("./chunk2").then((chunk2) => {
			expect(chunk2.value).toBe(1);
			NEXT(require("../../update")(done));
			import.meta.webpackHot.accept(["./chunk", "./chunk2"], () => {
				import("./chunk").then((chunk) => {
					expect(chunk.value).toBe(2);
					import("./chunk2").then((chunk2) => {
						expect(chunk2.value).toBe(2);
						done();
					}).catch(done);
				}).catch(done);
			});
		}).catch(done);
	}).catch(done);
});
