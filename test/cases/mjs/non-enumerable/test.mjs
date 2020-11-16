import * as m1 from "./analysable-module.js";
import * as m2 from "./weird-module.js";
import * as m3 from "./esModule.js";
import d1 from "./analysable-module.js";
import d2 from "./weird-module.js";
import d3 from "./esModule.js";

it("should include non-enumable properties (mjs)", () => {
	const ns = m1;

	expect(m1.prop).toBe(true);
	expect(ns.prop).toBe(true);

	expect(m1.nonEnumerable).toBe(true);
	expect(ns.nonEnumerable).toBe(true);

	expect(m1.default).toBeTypeOf("object");
	expect(ns.default).toBeTypeOf("object");

	expect(m1.__esModule).toBe(true);
	expect(ns.__esModule).toBe(true);
});

it("should include non-enumable properties (mjs, promise)", () =>
	import("./analysable-module.js").then(m1 => {
		const ns = m1;

		expect(m1.prop).toBe(true);
		expect(ns.prop).toBe(true);

		expect(m1.nonEnumerable).toBe(true);
		expect(ns.nonEnumerable).toBe(true);

		expect(m1.default).toBeTypeOf("object");
		expect(ns.default).toBeTypeOf("object");

		expect(m1.__esModule).toBe(true);
		expect(ns.__esModule).toBe(true);
	}));

it("should not include prototype properties and symbols (mjs)", () => {
	const ns = m2;
	const sym = m2.sym;

	expect(m2.prop).toBe(true);
	expect(ns.prop).toBe(true);

	expect(m2.nonEnumerable).toBe(true);
	expect(ns.nonEnumerable).toBe(true);

	expect(m2.protoProp).toBe(true);
	expect(ns.protoProp).toBe(true);

	expect(m2.nonEnumerablePrototype).toBe(true);
	expect(ns.nonEnumerablePrototype).toBe(true);

	expect(m2[sym]).toBe(undefined);
	expect(ns[sym]).toBe(undefined);

	expect(m2.default).toBeTypeOf("object");
	expect(ns.default).toBeTypeOf("object");

	expect(m2.__esModule).toBe(true);
	expect(ns.__esModule).toBe(true);
});

it("should not include prototype properties and symbols (mjs, promise)", () =>
	import("./weird-module.js").then(m2 => {
		const ns = m2;
		const sym = m2.sym;

		expect(m2.prop).toBe(true);
		expect(ns.prop).toBe(true);

		expect(m2.nonEnumerable).toBe(true);
		expect(ns.nonEnumerable).toBe(true);

		expect(m2.protoProp).toBe(true);
		expect(ns.protoProp).toBe(true);

		expect(m2.nonEnumerablePrototype).toBe(true);
		expect(ns.nonEnumerablePrototype).toBe(true);

		expect(m2[sym]).toBe(undefined);
		expect(ns[sym]).toBe(undefined);

		expect(m2.default).toBeTypeOf("object");
		expect(ns.default).toBeTypeOf("object");

		expect(m2.__esModule).toBe(true);
		expect(ns.__esModule).toBe(true);
	}));

it("should include non-enumable properties with __esModule (non-mjs)", () => {
	const ns = m3;

	expect(m3.prop).toBe(true);
	expect(ns.prop).toBe(true);

	expect(m3.nonEnumerable).toBe(true);
	expect(ns.nonEnumerable).toBe(true);

	expect(m3.default).toBeTypeOf("object");
	expect(ns.default).toBeTypeOf("object");

	expect(m3.__esModule).toBe(true);
	expect(ns.__esModule).toBe(true);
});

it("should include non-enumable properties with __esModule (non-mjs, promise)", () =>
	import("./analysable-module.js").then(m3 => {
		const ns = m3;

		expect(m3.prop).toBe(true);
		expect(ns.prop).toBe(true);

		expect(m3.nonEnumerable).toBe(true);
		expect(ns.nonEnumerable).toBe(true);

		expect(m3.default).toBeTypeOf("object");
		expect(ns.default).toBeTypeOf("object");

		expect(m3.__esModule).toBe(true);
		expect(ns.__esModule).toBe(true);
	}));

it("should not handle __esModule for the default import (mjs)", () => {
	expect(d1.__esModule).toBe(undefined);
	expect(Object(d1).__esModule).toBe(undefined);

	expect(d2.__esModule).toBe(undefined);
	expect(Object(d2).__esModule).toBe(undefined);

	expect(d3.__esModule).toBe(true);
	expect(Object(d3).__esModule).toBe(true);
});
