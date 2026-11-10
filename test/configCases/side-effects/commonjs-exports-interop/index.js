import "./imported-bare-and-required";
import defaultImport from "./default-import";
import { a as namedA, f as namedF } from "./named-import";
import * as namespaceImport from "./namespace-import";
import moduleExportsFunction from "./module-exports-function";
import esModuleDefault, { named as esModuleNamed } from "./es-module-flag";
import { a as typescriptA } from "./typescript-getter";
import { a as barrelA, f as barrelF, namespace as barrelNamespace } from "./barrel";
import { unrelated as bindingUnrelated } from "./binding-unused";
import { unrelated as mutatingUnrelated } from "./binding-mutating";
import { a as mutatedA } from "./binding-mutated";

require("./required-bare");
if (typeof window !== "object" || typeof window === "object") {
	require("./required-conditionally");
}

const bundled = (name) => `./${name}.js` in __webpack_modules__;

it("should drop a pure module required only for its evaluation", () => {
	expect(bundled("required-bare")).toBe(false);
	expect(bundled("required-conditionally")).toBe(false);
});

it("should keep a pure module imported bare and required for its value", () => {
	expect(require("./imported-bare-and-required").a).toBe(1);
	expect(bundled("imported-bare-and-required")).toBe(true);
});

it("should read a pure module through every ESM import form", () => {
	expect(defaultImport.a).toBe(1);
	expect(defaultImport.f()).toBe("f");
	expect(namedA).toBe(1);
	expect(namedF()).toBe("f");
	expect(namespaceImport.a).toBe(1);
	expect(namespaceImport.default.f()).toBe("f");
	expect(moduleExportsFunction()).toBe(7);
	expect(moduleExportsFunction.extra).toBe(1);
	expect(esModuleDefault).toBe(1);
	expect(esModuleNamed).toBe(2);
	expect(typescriptA).toBe(5);
});

it("should read a pure module through ESM re-exports", () => {
	expect(barrelA).toBe(1);
	expect(barrelF()).toBe("f");
	expect(barrelNamespace.a).toBe(1);
});

it("should read a pure module through CommonJS re-exports", () => {
	expect(require("./reexport-whole").f()).toBe("f");
	expect(require("./reexport-property").a).toBe(1);
});

it("should keep a require binding only where its value is read", () => {
	expect(bindingUnrelated).toBe(3);
	expect(bundled("binding-target")).toBe(false);
	expect(mutatingUnrelated).toBe(4);
	// the mutation runs because its module evaluates the binding
	expect(mutatedA).toBe("mutated");
});

it("should read a pure module across a require cycle", () => {
	const cycle = require("./cycle-a");
	expect(cycle.value()).toBe(3);
	expect(cycle.b.peer()).toBe(cycle);
});

it("should read a pure module required lazily", () => {
	const get = () => require("./lazy-required");
	expect(get().a).toBe(1);
});

it("should read a pure module from an async chunk", () =>
	import("./dynamic-imported").then((module) => {
		expect(module.a).toBe(1);
		expect(module.default.f()).toBe("f");
	}));

it("should read a pure module inside require.ensure", (done) => {
	require.ensure([], (require) => {
		try {
			expect(require("./ensured").a).toBe(1);
			done();
		} catch (error) {
			done(error);
		}
	});
});
