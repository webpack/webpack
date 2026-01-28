it("entry2 should compile and run", () => {
	import(/* webpackChunkName: "chunk-reason-webpackChunkName" */'../common').then(common => {
		common.default();
		expect(true).toBe(true)
	})
});
