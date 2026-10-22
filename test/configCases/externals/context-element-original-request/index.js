/**
 * @param {string} name name of the config
 * @returns {Promise<EXPECTED_ANY>} the imported config
 */
const load = (name) => import(`#configs/${name}.js`);

/**
 * @param {string} name name of the config
 * @returns {Promise<EXPECTED_ANY>} the imported config
 */
const loadWithQuery = (name) => import(`./configs/${name}.js?query#hash`);

it("should provide the original request to an externals function", async () => {
	expect((await load("a")).default.value).toBe("external a");
});

it("should match an externals object against the original request", async () => {
	expect((await load("b")).default.value).toBe("external b");
});

it("should match an externals string against the original request", async () => {
	expect((await load("c")).default.value).toBe("external c");
});

it("should match an externals RegExp against the original request", async () => {
	expect((await load("d")).default.value).toBe("external d");
});

it("should keep the request of an element with inline loaders", async () => {
	const name = "e";
	const module = await import(`./loader.js!./configs/${name}.txt`);
	expect(module.default).toBe("inline loader e");
});

it("should provide the original request of an element in a subdirectory", async () => {
	expect((await load("nested/f")).default.value).toBe("bundled f");
});

it("should not repeat the query and fragment in the original request", async () => {
	expect((await loadWithQuery("q")).default.value).toBe("bundled q");
	expect((await loadWithQuery("a")).default.value).toBe("bundled a");
});
