it("should compile fine", () => {
	let dyn = "dynamic"
	let url = new URL(`./${dyn}?foo=bar`, import.meta.url)
	expect(url.search).toBe("?foo=bar")
	expect(url.pathname).toMatch("url/disable-dynamic-url/dynamic")

	let dyn2 = "./dynamic"
	let url2 = new URL(dyn2, import.meta.url)
	expect(url2 instanceof URL).toBe(true)
});
