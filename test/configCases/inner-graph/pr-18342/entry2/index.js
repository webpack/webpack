it("entry2 should compile and run", () => {
	import(/* webpackChunkName: "chunk-reason-webpackChunkName" */'../common').then(common => {
		common.default()
		console.log('entry2');
		expect(true).toBe(true)
	})
});
