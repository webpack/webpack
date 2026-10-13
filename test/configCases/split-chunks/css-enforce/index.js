import "package/styles.css";
import "./style.css";

it("should work and enforce create vendor CSS chunk", () => {
	const links = document.getElementsByTagName("link");
	const css = [];

	for (const link of links) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
});
