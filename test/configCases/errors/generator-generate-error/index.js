it("should compile with errors", async () => {
	let errored;

	let json;

	try {
		json = await import("./file.json");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/json error message/);

	let source;

	try {
		source = await import("./source.txt");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/asset\/source error message/);

	let resource;

	try {
		resource = await import("./file.svg");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/asset\/resource error message/);

	let inline;

	try {
		inline = await import("./inline.txt");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/asset\/inline error message/);

	let style;

	try {
		style = await import("./style.css");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/css error message/);

	let js;

	try {
		js = await import("./module.js");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/javascript\/auto error message/);

	let otherStyle;
	errored = undefined;

	try {
		otherStyle = await import("./style-other.css");
	} catch (error) {
		errored = error;
	}

	expect(errored).toBeUndefined();

	let cssModules;

	try {
		cssModules = await import("./style.modules.css");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/css\/auto error message/);

	let asyncWasm;

	try {
		asyncWasm = await import("./async-wasm.wat");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/webassembly\/async error message/);
});
