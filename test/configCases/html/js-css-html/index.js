import html from "./page.html";
import "./style.css";

it("should work", () => {
	const myUrl = new URL("./image.png", import.meta.url);

	expect(myUrl).toMatchSnapshot();
	expect(html).toMatchSnapshot();

	const links = document.getElementsByTagName("link");
	const css = [];

	for (const link of links) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
});
