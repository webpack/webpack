import defer * as data from "./config.json" with { type: "json" };
import defer * as dataStr from "./config.json" with { "type": "json" };
import defer * as wrapped from "./wrapper.js";

import {
	assertTouched,
	assertUntouched,
	reset
} from "./side-effect-counter.cjs";

function assertIsNamespaceObject(ns) {
	if (typeof ns !== "object" || ns === null) {
		throw new TypeError("namespace is not an object");
	}
	if (!ns[Symbol.toStringTag]) {
		throw new Error(
			"namespace object does not have a Symbol.toStringTag property"
		);
	}
}

// Node.js does not implement `import defer` yet, and per the proposal deferring a
// module changes only when evaluation runs, not which exports are observable — so
// for JSON the deferred and non-deferred defaults must be identical.
const nodeJsReference = () =>
	import(/* webpackIgnore: true */ "./config.json", {
		with: { type: "json" }
	});

it("should match Node.js for static `import defer` of a JSON module", async () => {
	assertIsNamespaceObject(data);

	const ref = await nodeJsReference();

	expect(data.default).toEqual(ref.default);
	expect(data.default.value).toBe(42);
	expect(data.default.name).toBe("webpack");
	expect(data.default.nested.foo).toBe("bar");
	expect(data.default.nested.list).toEqual([1, 2, 3]);

	// Per the JSON modules spec (and Node.js native behavior), the deferred
	// namespace exposes `default` and no named exports for JSON keys.
	expect(Reflect.has(data, "default")).toBe(true);
	expect(Reflect.has(data, "value")).toBe(false);
	expect(Reflect.has(data, "nested")).toBe(false);
	expect(Reflect.get(data, "value")).toBe(undefined);
	expect(Reflect.get(data, "nested")).toBe(undefined);
	// Structural introspection works too — proxy invariants hold for the deferred
	// namespace. webpack additionally exposes `__esModule`, since
	// `__webpack_require__.r` stamps it non-configurably onto the proxy's target.
	expect(Object.getOwnPropertyNames(data)).toContain("default");

	// Quoted-key form of the import attribute should behave identically.
	assertIsNamespaceObject(dataStr);
	expect(dataStr.default).toEqual(ref.default);
});

it("should match Node.js for dynamic `import.defer` of a JSON module", async () => {
	const dyn = await import.defer("./config.json", { with: { type: "json" } });
	const ref = await nodeJsReference();

	assertIsNamespaceObject(dyn);
	expect(dyn.default).toEqual(ref.default);

	// Same default-only export shape as Node.js.
	expect(Reflect.has(dyn, "default")).toBe(true);
	expect(Reflect.has(dyn, "value")).toBe(false);
	expect(Reflect.get(dyn, "value")).toBe(undefined);

	// Quoted-key form of the import attribute should behave identically.
	const dynStr = await import.defer("./config.json", {
		"with": { "type": "json" }
	});
	assertIsNamespaceObject(dynStr);
	expect(dynStr.default).toEqual(ref.default);

	// `import.defer` honors `webpackMode` magic comments — eager mode resolves
	// without a separate chunk request, but the observable namespace shape is
	// identical to the regular dynamic form (and to Node.js).
	const eager = await import.defer(
		/* webpackMode: "eager" */ "./config.json",
		{ with: { type: "json" } }
	);
	assertIsNamespaceObject(eager);
	expect(eager.default).toEqual(ref.default);
});

it("should produce the same JSON value for static and dynamic `import defer`", async () => {
	const dyn = await import.defer("./config.json", { with: { type: "json" } });
	expect(dyn.default).toEqual(data.default);
});

it("should defer evaluation until first access (TC39 spec invariant)", () => {
	// Synthetic JSON modules have no observable evaluation side effects, so the
	// JSON import is wrapped in a JS module calling `touch()` at top level, and
	// `import defer * as wrapped` must not evaluate it until the namespace is read.
	reset();
	assertIsNamespaceObject(wrapped);
	assertUntouched();

	const value = Reflect.get(wrapped, "default");
	assertTouched();

	expect(value.value).toBe(42);

	// Subsequent accesses must not re-evaluate the wrapper.
	reset();
	expect(Reflect.get(wrapped, "default")).toBe(value);
	assertUntouched();
});
