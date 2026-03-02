"use strict";

const AppendOnlyStackedSet = require("../lib/util/AppendOnlyStackedSet");

describe("AppendOnlyStackedSet", () => {
	it("iterates empty instances", () => {
		const set = new AppendOnlyStackedSet();

		expect([...set]).toEqual([]);
	});

	it("keeps parent and child append layers separate", () => {
		const parent = new AppendOnlyStackedSet();
		parent.add("a");
		parent.add("b");
		const child = parent.createChild();

		child.add("c");

		expect([...parent]).toEqual(["a", "b"]);
		expect([...child]).toEqual(["c", "a", "b"]);
	});

	it("clear detaches current stack without mutating shared sets", () => {
		const parent = new AppendOnlyStackedSet();
		parent.add("a");
		const child = parent.createChild();

		parent.clear();

		expect([...parent]).toEqual([]);
		expect(parent.has("a")).toBe(false);
		expect([...child]).toEqual(["a"]);
		expect(child.has("a")).toBe(true);

		parent.add("b");

		expect([...parent]).toEqual(["b"]);
	});
});
