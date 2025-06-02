it("should compile fine", () => {
	let dyn = "a"
	let test
	test = new URL(`./json/${dyn}.json`, import.meta.url)
	expect(test).toMatch("json/a.json")
	dyn = "b"
	test = new URL(`./json/${dyn}.json`, import.meta.url)
	expect(test).toMatch("json/b.json")
	dyn = "c"
	test = new URL(`./json/${dyn}.json`, import.meta.url)
	expect(test).toMatch("json/c.json")
	dyn = "c"
	test = new URL(`./js/${dyn}.js`, import.meta.url)
	expect(test).toMatch("js/c.js")
	dyn = "b"
	test = new URL(`./js/${dyn}.js`, import.meta.url)
	expect(test).toMatch("js/b.js")
	dyn = "a"
	test = new URL(`./js/${dyn}.js?foo=bar`, import.meta.url)
	expect(test).toMatch("js/a.js")
	test = new URL('./js/' + dyn + ".js?foo=bar", import.meta.url)
	expect(test).toMatch("js/a.js")
});
