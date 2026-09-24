const urls = [
	new URL("./files/script.js#frag", import.meta.url),
	new URL("./files/data.txt#a.css", import.meta.url)
];
if (CSS_AND_HTML) {
	urls.push(
		new URL("./files/style.css#dark", import.meta.url),
		new URL("./files/page.html#top", import.meta.url)
	);
}

it("should keep the fragment in the emitted asset URLs", () => {
	expect(urls[0].href).toMatch(/script\.js#frag$/);
	expect(urls[1].href).toMatch(/data\.txt#a\.css$/);
	if (CSS_AND_HTML) {
		expect(urls[2].href).toMatch(/style\.css#dark$/);
		expect(urls[3].href).toMatch(/page\.html#top$/);
	}
});
