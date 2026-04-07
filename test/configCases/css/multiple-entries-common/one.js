import "./a.css";
import "./b.css";

it("should work", async () => {
	await import("./async-one.js");

	const links = document.getElementsByTagName("link");

	expect(links.find((item) => /one\.css/.test(item.href)).sheet.css).toMatchSnapshot("initial");
	expect(links.find((item) => /async-one_js-c_css-d_css\.chunk\.css/.test(item.href)).sheet.css).toMatchSnapshot("async");
});
