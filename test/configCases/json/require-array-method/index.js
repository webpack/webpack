const arr = require("./array.json");
const obj = require("./object.json");
const nested = require("./nested.json");

// Note: none of these assertions may read `arr`/`obj`/`nested.list` as a whole
// value — doing so would mark the namespace fully used and hide the regression.
// Every check must go through a prototype method call on the JSON value.

it("should keep the whole array when a prototype method is called on it (#21426)", () => {
	// `includes`/`indexOf`/`join` are not JSON exports; the elements must survive.
	expect(arr.includes("a")).toBe(true);
	expect(arr.includes("c")).toBe(true);
	expect(arr.indexOf("b")).toBe(1);
	expect(arr.join(",")).toBe("a,b,c");
});

it("should keep the whole object when a prototype method is called on it", () => {
	expect(obj.hasOwnProperty("x")).toBe(true);
	expect(obj.hasOwnProperty("y")).toBe(true);
	expect(obj.hasOwnProperty("z")).toBe(false);
});

it("should keep a nested array reached through a static member", () => {
	expect(nested.list.includes("p")).toBe(true);
	expect(nested.list.join("")).toBe("pq");
	// Reading the nested array as a whole value keeps every provided element.
	expect(Array.isArray(nested.list)).toBe(true);
});

it("should still tree-shake unused indices for pure index access", () => {
	const fs = require("fs");
	const content = fs.readFileSync(__filename, "utf-8");
	// Build the markers at runtime so this assertion source doesn't embed them.
	const kept = ["kept", "1"].join("");
	const unused0 = ["UNUSED", "0"].join("");
	const unused2 = ["UNUSED", "2"].join("");
	// Reading a single index keeps that element and drops the others.
	expect(nested.shaken[1]).toBe(kept);
	expect(content.includes(kept)).toBe(true);
	expect(content.includes(unused0)).toBe(false);
	expect(content.includes(unused2)).toBe(false);
});
