function nothing() {}

it("entry3 should compile and run", () => {
	import(/* webpackChunkName: "chunk-reason-webpackChunkName" */'./a.js').then(a => {
		nothing(a.default);
		expect(true).toBe(true)
	})
});
