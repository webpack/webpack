"use strict";

const { sortWithSourceOrder } = require("../lib/util/comparators");

describe("sortWithSourceOrder", () => {
	let dependencySourceOrderMap;

	beforeEach(() => {
		dependencySourceOrderMap = new WeakMap();
	});

	it("dependency without the sourceOrder attribute must keep their original index in the array", () => {
		const deps = [
			// HarmonyImportSpecifierDependency
			{ name: "b", sourceOrder: 10 },
			// CommonJSRequireDependency
			{ name: "a" },
			// CommonJSRequireDependency
			{ name: "d" },
			// HarmonyImportSpecifierDependency
			{ name: "c", sourceOrder: 5 }
		];

		sortWithSourceOrder(deps, dependencySourceOrderMap);

		expect(deps.map(d => d.name)).toEqual(["c", "a", "d", "b"]);
	});

	it("should sort dependencies by main order when both in map", () => {
		const deps = [
			{ name: "b", sourceOrder: 5 },
			{ name: "a", sourceOrder: 10 },
			{ name: "c", sourceOrder: 3 }
		];

		// Add to map with main and sub orders
		dependencySourceOrderMap.set(deps[0], { main: 5, sub: 0 });
		dependencySourceOrderMap.set(deps[1], { main: 10, sub: 0 });
		dependencySourceOrderMap.set(deps[2], { main: 3, sub: 0 });

		sortWithSourceOrder(deps, dependencySourceOrderMap);

		expect(deps.map(d => d.name)).toEqual(["c", "b", "a"]);
	});

	it("should sort by sub order when main order is same", () => {
		const deps = [
			{ name: "b", sourceOrder: 5 },
			{ name: "a", sourceOrder: 5 },
			{ name: "c", sourceOrder: 5 }
		];

		// Add to map with same main but different sub orders
		dependencySourceOrderMap.set(deps[0], { main: 5, sub: 3 });
		dependencySourceOrderMap.set(deps[1], { main: 5, sub: 1 });
		dependencySourceOrderMap.set(deps[2], { main: 5, sub: 2 });

		sortWithSourceOrder(deps, dependencySourceOrderMap);

		expect(deps.map(d => d.name)).toEqual(["a", "c", "b"]);
	});

	it("should sort mixed dependencies - some in map, some not", () => {
		const deps = [
			{ name: "b", sourceOrder: 10 },
			{ name: "a", sourceOrder: 5 },
			{ name: "c", sourceOrder: 15 }
		];

		// Only add one to map
		dependencySourceOrderMap.set(deps[0], { main: 10, sub: 0 });

		sortWithSourceOrder(deps, dependencySourceOrderMap);

		expect(deps.map(d => d.name)).toEqual(["a", "b", "c"]);
	});

	it("should sort by sourceOrder when none in map", () => {
		const deps = [
			{ name: "b", sourceOrder: 10 },
			{ name: "a", sourceOrder: 5 },
			{ name: "c", sourceOrder: 15 }
		];

		sortWithSourceOrder(deps, dependencySourceOrderMap);

		expect(deps.map(d => d.name)).toEqual(["a", "b", "c"]);
	});

	it("should sort complex scenario with negative and decimal values", () => {
		const deps = [
			{ name: "f", sourceOrder: 10 },
			{ name: "e", sourceOrder: 5 },
			{ name: "d", sourceOrder: 20 },
			{ name: "c", sourceOrder: 10 },
			{ name: "b", sourceOrder: 5 },
			{ name: "a", sourceOrder: 3 }
		];

		dependencySourceOrderMap.set(deps[0], { main: 10, sub: 0.5 });
		dependencySourceOrderMap.set(deps[1], { main: 5, sub: 0.5 });
		dependencySourceOrderMap.set(deps[2], { main: 20, sub: 0 });
		dependencySourceOrderMap.set(deps[3], { main: 10, sub: 0.25 });
		dependencySourceOrderMap.set(deps[4], { main: 5, sub: 0.25 });
		dependencySourceOrderMap.set(deps[5], { main: 3, sub: 0 });

		sortWithSourceOrder(deps, dependencySourceOrderMap);

		expect(deps.map(d => d.name)).toEqual(["a", "b", "e", "c", "f", "d"]);
	});

	it("should maintain stable sort for equal values", () => {
		const deps = [
			{ name: "b", sourceOrder: 5 },
			{ name: "a", sourceOrder: 5 },
			{ name: "c", sourceOrder: 5 }
		];

		sortWithSourceOrder(deps, dependencySourceOrderMap);

		expect(deps.map(d => d.name)).toEqual(["b", "a", "c"]);
	});
});
