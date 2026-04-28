import defer * as data from "./config.json" with { type: "json" };
import defer * as dataStr from "./config.json" with { "type": "json" };

function assertIsNamespaceObject(ns) {
	if (typeof ns !== "object" || ns === null) {
		throw new TypeError("namespace is not an object");
	}
	if (!ns[Symbol.toStringTag]) {
		throw new Error("namespace object does not have a Symbol.toStringTag property");
	}
}

it("should support static `import defer` of a JSON module with import attributes", () => {
	assertIsNamespaceObject(data);
	expect(data.default.value).toBe(42);
	expect(data.default.name).toBe("webpack");
	expect(data.default.nested.foo).toBe("bar");
	expect(data.default.nested.list).toEqual([1, 2, 3]);

	// Per the JSON modules spec (and Node.js behavior), JSON modules expose
	// only a `default` export — no named exports are available on the
	// deferred namespace.
	expect(Reflect.has(data, "default")).toBe(true);
	expect(Reflect.has(data, "value")).toBe(false);
	expect(Reflect.has(data, "nested")).toBe(false);
	expect(Reflect.get(data, "value")).toBe(undefined);
	expect(Reflect.get(data, "nested")).toBe(undefined);

	// Quoted-key form of the import attribute should behave identically.
	assertIsNamespaceObject(dataStr);
	expect(dataStr.default.value).toBe(42);
	expect(Reflect.has(dataStr, "default")).toBe(true);
});

it("should support dynamic `import.defer` of a JSON module with import attributes", async () => {
	const dyn = await import.defer("./config.json", { with: { type: "json" } });

	assertIsNamespaceObject(dyn);
	expect(dyn.default.value).toBe(42);
	expect(dyn.default.name).toBe("webpack");
	expect(dyn.default.nested.foo).toBe("bar");
	expect(dyn.default.nested.list).toEqual([1, 2, 3]);

	// JSON has no named exports — the deferred dynamic namespace mirrors the
	// static form.
	expect(Reflect.has(dyn, "default")).toBe(true);
	expect(Reflect.has(dyn, "value")).toBe(false);
	expect(Reflect.get(dyn, "value")).toBe(undefined);

	// Quoted-key form of the import attribute should behave identically.
	const dynStr = await import.defer("./config.json", {
		"with": { "type": "json" }
	});
	assertIsNamespaceObject(dynStr);
	expect(dynStr.default.value).toBe(42);

	// `import.defer` honors `webpackMode` magic comments — eager mode resolves
	// without a separate chunk request, but the observable namespace shape is
	// identical to the regular dynamic form.
	const eager = await import.defer(
		/* webpackMode: "eager" */ "./config.json",
		{ with: { type: "json" } }
	);
	assertIsNamespaceObject(eager);
	expect(eager.default.value).toBe(42);
});

it("should produce the same JSON value for static and dynamic `import defer`", async () => {
	const dyn = await import.defer("./config.json", { with: { type: "json" } });
	expect(dyn.default).toEqual(data.default);
});
