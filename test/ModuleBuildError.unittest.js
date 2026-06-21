"use strict";

const ModuleBuildError = require("../lib/errors/ModuleBuildError");

describe("ModuleBuildError", () => {
	it("is an error with the right name", () => {
		const err = new ModuleBuildError(new Error("boom"));
		expect(err).toBeInstanceOf(Error);
		expect(err.name).toBe("ModuleBuildError");
	});

	it("keeps the V8 stack (which already starts with the message)", () => {
		const inner = new Error("v8 boom");
		const err = new ModuleBuildError(inner);
		// V8 `.stack` includes the message, so the whole stack is appended.
		expect(err.message).toContain("v8 boom");
		expect(err.message).toContain(inner.stack);
	});

	it("leads with `name: message` when the stack omits the message (JSC)", () => {
		const err = new ModuleBuildError({
			name: "TypeError",
			message: "jsc boom",
			stack: "doStuff@file.js:1:1\nglobal code@file.js:2:2"
		});
		expect(err.message).toContain("TypeError: jsc boom");
		// The frames-only stack is not appended in this branch.
		expect(err.message).not.toContain("file.js:1:1");
	});

	it("uses just the message when the stack omits it and there is no name", () => {
		const err = new ModuleBuildError({
			name: "",
			message: "no-name boom",
			stack: "@file.js:1:1"
		});
		expect(err.message).toContain("no-name boom");
		expect(err.message).not.toContain("TypeError");
	});

	it("moves the stack to details when hideStack is set", () => {
		const err = new ModuleBuildError({
			name: "Error",
			message: "hidden boom",
			stack: "Error: hidden boom\n    at file.js:1:1",
			hideStack: true
		});
		expect(err.message).toContain("hidden boom");
		expect(err.details).toContain("file.js:1:1");
	});

	it("prefixes the source with `from` when provided", () => {
		const err = new ModuleBuildError(new Error("boom"), { from: "my-loader" });
		expect(err.message).toContain("Module build failed (from my-loader):");
	});
});
