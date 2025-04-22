import "./index.css";

it("should work", done => {
	const links = window.document.getElementsByTagName("link");
	expect(links[0].sheet.css).toContain("color: red;");
	NEXT(
		require("../../update")(done, true, () => {
			const links = window.document.getElementsByTagName("link");
			expect(links[0].sheet.css).toContain("color: blue;");
		})
	);
});
