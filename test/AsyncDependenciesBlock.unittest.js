"use strict";

const AsyncDependenciesBlock = require("../lib/AsyncDependenciesBlock");

describe("AsyncDependenciesBlock", () => {
	it("initializes with string group options", () => {
		const block = new AsyncDependenciesBlock("my-chunk", null, "request");
		expect(block.groupOptions).toEqual({
			name: "my-chunk",
			circular: true
		});
		expect(block.chunkName).toBe("my-chunk");
		expect(block.loc).toBeNull();
		expect(block.request).toBe("request");
	});

	it("initializes with object group options", () => {
		const options = { name: "custom-chunk" };
		const loc = { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } };
		const block = new AsyncDependenciesBlock(options, loc, "req");

		expect(block.groupOptions).toBe(options);
		expect(block.groupOptions.circular).toBe(true);
		expect(block.chunkName).toBe("custom-chunk");
		expect(block.loc).toBe(loc);
		expect(block.request).toBe("req");
	});

	it("initializes with empty group options", () => {
		const block = new AsyncDependenciesBlock(undefined, null, null);
		expect(block.groupOptions).toEqual({
			name: undefined,
			circular: true
		});
		expect(block.chunkName).toBeUndefined();
	});

	it("handles circular option correctly", () => {
		const block = new AsyncDependenciesBlock({ circular: false }, null, null);
		expect(block.groupOptions.circular).toBe(false);
		expect(block.circular).toBe(false);

		const defaultBlock = new AsyncDependenciesBlock({}, null, null);
		expect(defaultBlock.circular).toBe(true);
	});

	it("allows setting chunkName", () => {
		const block = new AsyncDependenciesBlock("initial");
		expect(block.chunkName).toBe("initial");

		block.chunkName = "updated";
		expect(block.chunkName).toBe("updated");
		expect(block.groupOptions.name).toBe("updated");
	});

	it("throws when accessing removed module property", () => {
		const block = new AsyncDependenciesBlock("test");
		expect(() => block.module).toThrow(/module property was removed/);
		expect(() => {
			block.module = "foo";
		}).toThrow(/module property was removed/);
	});
});
