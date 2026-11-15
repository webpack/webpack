const NativeURL = URL;

it("should preserve URL objects and their properties for dynamic assets", () => {
	/**
	 * @param {string} name asset name
	 * @returns {URL} asset URL
	 */
	const createUrl = name => new URL(`./assets/${name}.txt?query=yes#fragment`, import.meta.url);
	const actual = createUrl("file");
	const expected = new URL("./assets/file.txt?query=yes#fragment", import.meta.url);

	expect(actual).toBeInstanceOf(URL);
	expect(actual.href).toBe(expected.href);
	expect(actual.pathname).toBe(expected.pathname);
	expect(actual.origin).toBe(expected.origin);
	expect(actual.search).toBe("?query=yes");
	expect(actual.searchParams.get("query")).toBe("yes");
	expect(actual.hash).toBe("#fragment");
	expect(actual.toString()).toBe(expected.toString());
	expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
});

it("should preserve URL objects for concatenated and bare asset requests", () => {
	/**
	 * @param {string} name asset name
	 * @returns {URL} asset URL
	 */
	const concatenated = name => new URL("./assets/" + name + ".txt", import.meta.url);
	/**
	 * @param {string} name asset name
	 * @returns {URL} asset URL
	 */
	const bare = name => new URL(`assets/${name}.txt`, import.meta.url);
	const expected = new URL("./assets/file.txt", import.meta.url);

	for (const createUrl of [concatenated, bare]) {
		const actual = createUrl("file");
		expect(actual).toBeInstanceOf(URL);
		expect(actual.href).toBe(expected.href);
	}
});

it("should preserve parenthesized requests and evaluate their side effects once", () => {
	let calls = 0;
	/**
	 * @param {string} name asset name
	 * @returns {URL} asset URL
	 */
	const createUrl = name => new URL((`./assets/${(calls++, name)}.txt`), (import.meta.url),);
	const actual = createUrl("file");
	const expected = new URL("./assets/file.txt", import.meta.url);

	expect(actual).toBeInstanceOf(URL);
	expect(actual.href).toBe(expected.href);
	expect(calls).toBe(1);
});

it("should preserve the URL constructor when a local binding shadows its name", () => {
	/**
	 * @param {string} name asset name
	 * @param {null} URL shadowed constructor
	 * @returns {URL} asset URL
	 */
	const createUrl = (name, URL) => new NativeURL(`./assets/${name}.txt`, import.meta.url);
	const actual = createUrl("file", null);
	const expected = new URL("./assets/file.txt", import.meta.url);

	expect(actual).toBeInstanceOf(NativeURL);
	expect(actual.href).toBe(expected.href);
});

it("should report a missing dynamic asset", () => {
	/**
	 * @param {string} name asset name
	 * @returns {URL} asset URL
	 */
	const createUrl = name => new URL(`./assets/${name}.txt`, import.meta.url);

	expect(() => createUrl("missing")).toThrow(/Cannot find module/);
});
