import "./loader!./style.css";

it("should work", async function (done) {
	const links = window.document.getElementsByTagName("link");
	expect(links[0].sheet.css).toContain("color: red;");

	NEXT(require("../../update")(done, {
		ignoreErrored: true
	}, () => {
		expect(links[0].sheet.css).toContain("Error in loader");

		NEXT(require("../../update")(done, {
			ignoreErrored: true
		}, () => {
			expect(links[0].sheet.css).toContain("color: blue;");

			done();
		}));
	}));
});

if (import.meta.webpackHot) {
	import.meta.webpackHot.accept("./loader!./style.css");
}

