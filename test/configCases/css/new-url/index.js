import './style3.css'

it('new URL should not affect chunk css module', () => {
	const links = document.getElementsByTagName("link");
	const css = links[1].sheet.css;
	expect(css).toMatchSnapshot();
})
it("should compile", done => {
	const url = new URL("./style.css", import.meta.url);
	const url1 = new URL('./style.css', import.meta.url);
	const url2 = new URL('./style.css?foo=1', import.meta.url);
	
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = url.href;

	expect(url.href).toEqual(url1.href);
	expect(link.sheet.css).toMatchSnapshot();
	expect(url.href).toMatchSnapshot();
	expect(url2.href).toMatchSnapshot();
	done();
});
