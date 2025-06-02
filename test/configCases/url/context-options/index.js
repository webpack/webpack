const throwModuleNotFound = fn => expect(fn).toThrow(/Cannot find module/);

it("should work with context options", () => {
	// webpackInclude
	let dyn = "/a.json";
	let url = new URL(
		/* webpackInclude: /.json$/ */ "./folder1" + dyn,
		import.meta.url
	);
	expect(url).toMatch("folder1/a.json");

	// webpackExclude
	dyn = "/b.js";
	throwModuleNotFound(() => {
		url = new URL(
			/* webpackInclude: /.json$/ */ "./folder1" + dyn,
			import.meta.url
		);
	});

	dyn = "/c.js";
	throwModuleNotFound(() => {
		url = new URL(
			/* webpackExclude: /.js$/ */ "./folder1" + dyn,
			import.meta.url
		);
	});

	// webpackExclude interfere the context prefix
	throwModuleNotFound(() => {
		dyn = "/a.json";
		url = new URL(
			/* webpackExclude: /[\\/]folder2[\\/]/ */ "./folder2" + dyn,
			import.meta.url
		);
	});

	// webpackIgnore
	dyn = "bundle0.js";
	url = new URL(/* webpackIgnore: true */ "./" + dyn, import.meta.url);
	expect(url.href).toMatch(__webpack_base_uri__.href);
});
