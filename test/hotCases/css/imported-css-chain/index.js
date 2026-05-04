import "./index.css";

it("should work with HMR for chained @imports", (done) => {
	const links = window.document.getElementsByTagName("link");
	expect(links[0].sheet.css).toContain("border: 1px solid red;");
	expect(links[0].sheet.css).toContain("background: red;");

	NEXT(
		require("../../update")(done, true, () => {
			const updatedLinks = window.document.getElementsByTagName("link");
			expect(updatedLinks[0].sheet.css).toContain("border: 1px solid blue;");
			expect(updatedLinks[0].sheet.css).toContain("background: green;");
			done();
		})
	);
});
