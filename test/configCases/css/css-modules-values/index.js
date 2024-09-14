import * as styles from './style.css';

it("should compile", (done) => {
	const links = document.getElementsByTagName("link");
	const css = links[1].sheet.css;

	expect(css).toMatchSnapshot();
	expect(styles).toMatchSnapshot();
	done()
})