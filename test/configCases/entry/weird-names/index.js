it("should load on demand", () =>
	import(/* webpackChunkName: "././../chunk/chunk/./../" */ "./chunk").then(r =>
		expect(r).toEqual(expect.objectContaining({ default: 42 }))
	));
