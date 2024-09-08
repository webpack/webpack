import './style3.css'

it('new URL should not affect chunk css module', () => {
	const links = document.getElementsByTagName("link");
	const css = [];

	// Skip first because import it by default
	for (const link of links.slice(1)) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
})
it("should compile", done => {
	const url = new URL("./style.css", import.meta.url);
	
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = url.href;

	expect(link.sheet.css).toMatchSnapshot();

	expect(url.href).toMatchSnapshot();
	done();
});
