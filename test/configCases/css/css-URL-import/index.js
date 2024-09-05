it("should compile", done => {
	const url = new URL("./style.css", import.meta.url);
	const link = document.createElement("link");
	link.rel = "stylesheet";
	link.href = url.href;

	expect(link.sheet.css).toMatchSnapshot();

	expect(link.sheet._element === link).toMatchSnapshot();
	done();
});
