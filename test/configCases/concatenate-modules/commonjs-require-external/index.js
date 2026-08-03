// the ESM import creates the concatenation that the require()d external joins
import { tag } from "./member";

// installed after every eager member has run, so a hoisted external would read
// the global before this getter exists
Object.defineProperty(global, "__lazyExternal", {
	configurable: true,
	get() {
		global.__externalOrder = global.__externalOrder.concat("external");
		return "lazy-external";
	}
});

function loadPath() {
	return require("path");
}

function loadLazy() {
	return require("lazy-ext");
}

it("should resolve a require() of an external module from a concatenated module", () => {
	expect(tag).toBe("member");
	expect(loadPath().basename("a/b/c.js")).toBe("c.js");
});

// An external has no body of its own to run, but a plain-expression one
// (`require()`, a global read) still renders inside the lazy wrapper, so it
// evaluates at the require() instead of at its hoisted position.
it("should evaluate a wrapped external at the require() call site", () => {
	// only the eager members have run so far
	expect(global.__externalOrder).toEqual(["member"]);
	expect(loadLazy()).toBe("lazy-external");
	expect(global.__externalOrder).toEqual(["member", "external"]);
	// the wrapper memoizes: a second require() does not read the global again
	expect(loadLazy()).toBe("lazy-external");
	expect(global.__externalOrder).toEqual(["member", "external"]);
});

it("should make the external a member of the concatenation", () => {
	const concatModules = __STATS__.modules.filter((m) => m.modules);
	expect(concatModules.length).toBe(1);
	expect(concatModules[0].modules.map((m) => m.name).sort()).toEqual([
		"./index.js",
		"./member.js",
		'external "global.__lazyExternal"',
		'external "path"'
	]);
	delete global.__externalOrder;
	delete global.__lazyExternal;
});
