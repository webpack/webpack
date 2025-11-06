import * as classes from "./style.modules.css";

it("should work", () => {
	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip first because import it by default
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(classes).toMatchSnapshot();
	expect(css).toMatchSnapshot();
});
