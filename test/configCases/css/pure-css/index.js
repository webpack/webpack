import "./style.css";

it("should compile", done => {
	const links = document.getElementsByTagName("link");
	const css = [];

	for (const link of links) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
	done();
});
