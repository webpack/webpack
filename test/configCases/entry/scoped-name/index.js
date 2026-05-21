it("should not URL-encode '@' in chunk filenames", () =>
	import(/* webpackChunkName: "@scope/chunk" */ "./chunk").then(r =>
		expect(r).toEqual(expect.objectContaining({ default: 42 }))
	));
