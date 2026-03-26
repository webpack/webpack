import "./b.css";
import "./a.css";

it("should work", async () => {
	await import("./async-two.js");

	const links = document.getElementsByTagName("link");

	expect(links.find((item) => /two\.css/.test(item.href)).sheet.css).toMatchSnapshot("initial");
	expect(links.find((item) => /async-two_js-c_css-d_css\.chunk\.css/.test(item.href)).sheet.css).toMatchSnapshot("async");
});
