it("should compile fine", () => {
	let dyn1 = "dynamic"
	let url1 = new URL(`./${dyn1}?foo=bar`, import.meta.url)
	expect(url1.search).toBe("?foo=bar")
	expect(url1.pathname).toMatch("url/disable-dynamic-url/dynamic")

	let dyn2 = "./dynamic"
	let url2 = new URL(dyn2, import.meta.url)
	expect(url2 instanceof URL).toBe(true)
});
