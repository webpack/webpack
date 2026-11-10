import update from "../../update.esm";
import "./style.css";

const cssText = () =>
	Array.from(window.document.getElementsByTagName("link"), (link) =>
		link.sheet ? link.sheet.css : ""
	).join("\n");

it("should load a stylesheet that moved into a new initial chunk", (done) => {
	expect(cssText()).toContain("color: red;");
	NEXT(
		update(done, true, () => {
			expect(cssText()).toContain("color: blue;");
			expect(cssText()).not.toContain("color: red;");
			done();
		})
	);
});

import.meta.webpackHot.accept();
