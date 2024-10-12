import "./style.css";

it("should compile", () => {
	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip first because import it by default
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
	expect(Object.keys(__webpack_modules__).length).toBe(3)
});
