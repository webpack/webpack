it("should handle HMR for CSS URL entry without crashing", done => {
	const url = new URL("./style.css", import.meta.url);
	expect(url.href).toMatch(/\.css$/);

	NEXT(
		require("../../update")(done, true, () => {
			const url2 = new URL("./style.css", import.meta.url);
			expect(url2.href).toMatch(/\.css$/);
			done();
		})
	);
});

module.hot.accept();
