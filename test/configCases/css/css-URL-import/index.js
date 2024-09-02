it("should compile", done => {
    const url = new URL('./style.css', import.meta.url);
	const links = document.getElementsByTagName("link");
    links[0].href = url;
	const css = [];

	for (const link of links) {
		css.push(link.sheet.css);
	}

	expect(css).toMatchSnapshot();
	done();
});
