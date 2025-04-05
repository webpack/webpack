it("should generate a custom error content", async () => {
	expect(__STATS__.modules.filter(m => m.moduleType !== "runtime").length).toEqual(14);
	expect(__STATS__.assets.length).toEqual(19);
	expect(__STATS__.chunks.length).toEqual(12);

	let errored;

	let json;

	try {
		json = await import("./file.json");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/json error message/);

	let otherJson;

	try {
		otherJson = await import("./other.json");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/json other error message/);

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

	let otherResource;

	try {
		otherResource = await import("./other.svg");
	} catch (error) {
		errored = error;
	}

	expect(errored.toString()).toMatch(/asset\/resource other error message/);

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
