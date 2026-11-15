import "./style.css";

it(`should work with URLs in CSS`, done => {
	const links = document.getElementsByTagName("link");
	const css = [];

	for (const link of links) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
	done();
});
