/**
 * @param {string} name name of the config
 * @returns {Promise<any>} the imported config
 */
const load = (name) => import(`#configs/${name}.js`);

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
