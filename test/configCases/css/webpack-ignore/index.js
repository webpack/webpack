import "./style.css";

it("should compile", done => {
	const links = document.getElementsByTagName("link");
	const css = links[0].sheet.css;

	expect(css).toMatchSnapshot();
	done();
});
