it("should load the chunk its comment names outside of output.path", () =>
	import(/* webpackChunkName: "../outside-chunk-name/b" */ "./lazy").then(
		(m) => {
			expect(m.default).toBe("lazy");
		}
	));
