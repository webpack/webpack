async function dynamic_import(dir, name) {
	if (dir === "a") {
		return import(
			/* webpackChunkName: "a" */
			/* webpackMode: "lazy-once" */
			`./dynamic_a/${name}.js`);
	}
	throw new Error();
}

it("should compile and run", async () => {
	await dynamic_import("a", "module_a1");
});
