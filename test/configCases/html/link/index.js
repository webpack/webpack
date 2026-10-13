import page from "./page.html";
import "./style.css";
import "./alt-style.css";

it("should handle link tag", () => {
	expect(page).toMatchSnapshot();

	// webpackIgnore leaves the stylesheet link untouched.
	expect(page).toContain('<link rel="stylesheet" href="./ignored.css">');

	const links = document.getElementsByTagName("link");
	const css = [];

	for (const link of links) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
});
