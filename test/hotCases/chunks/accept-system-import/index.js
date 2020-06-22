it("should import a changed chunk using module.hot.accept API", (done) => {
	import("./chunk").then((chunk) => {
		expect(chunk.value).toBe(1);
		import("./chunk2").then((chunk2) => {
			expect(chunk2.value).toBe(1);
			NEXT(require("../../update")(done));
			module.hot.accept(["./chunk", "./chunk2"], () => {
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

it("should import a changed chunk using import.meta.hot.accept API", (done) => {
	import("./chunk").then((chunk) => {
		expect(chunk.value).toBe(2);
		import("./chunk2").then((chunk2) => {
			expect(chunk2.value).toBe(2);
			NEXT(require("../../update")(done));
			import.meta.hot.accept(["./chunk", "./chunk2"], () => {
				import("./chunk").then((chunk) => {
					expect(chunk.value).toBe(3);
					import("./chunk2").then((chunk2) => {
						expect(chunk2.value).toBe(3);
						done();
					}).catch(done);
				}).catch(done);
			});
		}).catch(done);
	}).catch(done);
});
