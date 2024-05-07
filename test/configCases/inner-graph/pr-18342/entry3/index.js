it("entry3 should compile and run", () => {
	import(/* webpackChunkName: "chunk-reason-webpackChunkName" */'./a.js').then(a => {
    console.log(a.default);
		console.log('entry3');
		expect(true).toBe(true)
	})
});
