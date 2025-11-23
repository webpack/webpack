import "./index.css"

it("should work", done => {
	const links = window.document.getElementsByTagName("link");
	expect(links.length).toBe(1);

	NEXT(require("../../update")(done, true, () => {
		done()
	}))
});
module.hot.accept();
---
it("should work", done => {
	const links = window.document.getElementsByTagName("link");
	expect(links.length).toBe(0);

	done()
});