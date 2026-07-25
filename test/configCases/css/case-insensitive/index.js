import * as styles from "./style.modules.css";

it("handles upper- and mixed-case CSS names case-insensitively", (done) => {
	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip the first link (injected by test.config.js).
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	// `composes` (mixed-case) resolves, so `box` exports both class names.
	expect(styles.box.split(" ")).toContain(styles.base.split(" ")[0]);
	// `@KEYFRAMES Spin` is scoped, so the exported animation name is not the
	// verbatim `Spin` and `Animation-Name` references the scoped identifier.
	expect(css.join("\n")).toContain("Animation-Name:");

	expect(css).toMatchSnapshot("css");
	expect(styles).toMatchSnapshot("classes");
	done();
});
