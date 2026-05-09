import page from "./page.html";
import "./style.css";
import "./alt-style.css";

it("should handle link tag", () => {
	expect(page).toMatchSnapshot();

	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip first because import it by default
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
});
