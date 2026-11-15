import "./page.html";

it("should set the title's text with its character references read", (done) => {
	document.title = "version 1 & more";

	NEXT(
		require("../../update")(done, true, () => {
			expect(document.title).toBe("version 2 & more <3");
			expect(window.location.__reloadCount__ || 0).toBe(0);
			done();
		})
	);
});
