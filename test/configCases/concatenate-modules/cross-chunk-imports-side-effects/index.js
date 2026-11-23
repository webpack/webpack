import { takeEffects } from "./effects.js";

it("should run linked side effects in the order the registry runs them", async () => {
	const page1 = await import(/* webpackChunkName: "page-1" */ "./page-1.js");
	expect(takeEffects()).toEqual(["a", "b", "local-1", "late", "page-1"]);
	expect(page1.run()).toEqual(["b", "late", "dep"]);
	expect(takeEffects()).toEqual(["dep"]);
	const page2 = await import(/* webpackChunkName: "page-2" */ "./page-2.js");
	expect(page2.run()).toEqual(["a", "b", "late"]);
	expect(takeEffects()).toEqual(["local-2", "page-2"]);
});

it("should not run a side effect that a load of its chunk doesn't evaluate", async () => {
	const page4 = await import(/* webpackChunkName: "page-4" */ "./page-4.js");
	expect(page4.run()).toEqual(["y"]);
	expect(takeEffects()).toEqual([]);
	const page3 = await import(/* webpackChunkName: "page-3" */ "./page-3.js");
	expect(page3.run()).toEqual(["x", "y"]);
	expect(takeEffects()).toEqual(["x"]);
	const page7 = await import(/* webpackChunkName: "page-7" */ "./page-7.js");
	expect(page7.run()).toEqual(["x"]);
	expect(takeEffects()).toEqual([]);
});

it("should keep side effects in the registry when loads disagree on their order", async () => {
	const page6 = await import(/* webpackChunkName: "page-6" */ "./page-6.js");
	expect(page6.run()).toEqual(["d", "c"]);
	expect(takeEffects()).toEqual(["d", "c"]);
	const page5 = await import(/* webpackChunkName: "page-5" */ "./page-5.js");
	expect(page5.run()).toEqual(["c", "d"]);
	expect(takeEffects()).toEqual([]);
});

it("should run at chunk load only the side effects every load runs first", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	/**
	 * Returns a chunk's registry part and its linked scope.
	 * @param {string} name the chunk name
	 * @returns {string[]} the registry and the scope
	 */
	const split = (name) => {
		const source = fs.readFileSync(
			path.join(__dirname, `${name}.chunk.mjs`),
			"utf-8"
		);
		const end = /** @type {RegExpExecArray} */ (/^\};$|= \{\};$/m.exec(source));
		const index = end.index + end[0].length;
		return [source.slice(0, index), source.slice(index)];
	};
	/**
	 * Returns the part of a scope that runs at chunk load, without its init functions.
	 * @param {string} scope the scope
	 * @returns {string} what runs at chunk load
	 */
	const atLoad = (scope) => scope.replace(/^function \w+\(\) \{$[^]*?^\}$/gm, "");
	const [sharedRegistry, sharedScope] = split("shared");
	expect(atLoad(sharedScope).indexOf('push("a")')).toBeGreaterThan(-1);
	expect(sharedScope.indexOf('push("a")')).toBeLessThan(
		sharedScope.indexOf('push("b")')
	);
	// local-1 runs before late, so late's effect waits for its importer
	expect(sharedRegistry).not.toContain('push("late")');
	expect(sharedScope).toContain('push("late")');
	expect(atLoad(sharedScope)).not.toContain('push("late")');
	const [partialRegistry, partialScope] = split("partial");
	expect(partialRegistry).not.toContain('push("x")');
	expect(atLoad(partialScope)).not.toContain('push("x")');
	expect(partialScope).toContain('const y = () => "y";');
	const [conflictRegistry, conflictScope] = split("conflict");
	expect(conflictRegistry).not.toContain('push("c")');
	expect(atLoad(conflictScope)).not.toContain('push("c")');
	expect(atLoad(conflictScope)).not.toContain('push("d")');
});
