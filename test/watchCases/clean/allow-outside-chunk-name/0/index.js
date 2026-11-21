it("should load the chunk its comment names outside of output.path", () =>
	import(/* webpackChunkName: "../outside-chunk-name/a" */ "./lazy").then(
		(m) => {
			expect(m.default).toBe("lazy");
		}
	));
