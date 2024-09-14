import * as styles from './style.css';

it("should compile", (done) => {
	const links = document.getElementsByTagName("link");
	const css = [];

	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
	expect(styles).toMatchSnapshot();
	done()
})