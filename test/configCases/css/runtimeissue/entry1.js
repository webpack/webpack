it("should allow to create css modules", done => {
	// __non_webpack_require__("./common.js")
    debugger;
	import("./asyncChunk").then(({ default: {default: x} }) => {
		try {
			expect(x).toEqual({
				"dis": "617-dis",
				"item": "617-item",
				"menuButtonDisabled": "617-menuButtonDisabled",
				"toolOnly": "617-toolOnly",
			});
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});