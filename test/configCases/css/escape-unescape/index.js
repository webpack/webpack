import * as styles from "./style.modules.css";

it(`should work with URLs in CSS`, done => {
	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip first because import it by default
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot('css');
	expect(styles).toMatchSnapshot('classes');
	done();
});
