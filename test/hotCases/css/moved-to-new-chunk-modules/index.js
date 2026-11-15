import * as styles from "./style.module.css";

const cssText = () =>
	Array.from(window.document.getElementsByTagName("link"), (link) =>
		link.sheet ? link.sheet.css : ""
	).join("\n");

it("should load a CSS module that moved into a new initial chunk", (done) => {
	expect(cssText()).toContain("color: red;");
	NEXT(
		require("../../update")(done, true, () => {
			expect(cssText()).toContain("color: blue;");
			expect(cssText()).not.toContain("color: red;");
			done();
		})
	);
});

module.hot.accept("./style.module.css", () => {
	expect(styles).toHaveProperty("other");
});
