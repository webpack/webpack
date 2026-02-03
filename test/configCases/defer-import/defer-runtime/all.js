import * as dynamic_default from /* webpackDefer: true */ "./commonjs/dynamic_default.cjs";
import * as dynamic_default_ns from /* webpackDefer: true */ "./commonjs/dynamic_default_ns.cjs";
import * as dynamic_named from /* webpackDefer: true */ "./commonjs/dynamic_named.cjs";
import * as dynamic_named_ns from /* webpackDefer: true */ "./commonjs/dynamic_named_ns.cjs";
import * as dynamic_both from /* webpackDefer: true */ "./commonjs/dynamic_both.cjs";
import * as dynamic_both_ns from /* webpackDefer: true */ "./commonjs/dynamic_both_ns.cjs";

import * as flagged_default from /* webpackDefer: true */ "./commonjs/flagged_default.js";
import * as flagged_default_ns from /* webpackDefer: true */ "./commonjs/flagged_default_ns.js";
import * as flagged_named from /* webpackDefer: true */ "./commonjs/flagged_named.js";
import * as flagged_named_ns from /* webpackDefer: true */ "./commonjs/flagged_named_ns.js";
import * as flagged_both from /* webpackDefer: true */ "./commonjs/flagged_both.js";
import * as flagged_both_ns from /* webpackDefer: true */ "./commonjs/flagged_both_ns.js";

import * as esm_default from /* webpackDefer: true */ "./esm/esm_default.mjs";
import * as esm_default_ns from /* webpackDefer: true */ "./esm/esm_default_ns.mjs";
import * as esm_named from /* webpackDefer: true */ "./esm/esm_named.mjs";
import * as esm_named_ns from /* webpackDefer: true */ "./esm/esm_named_ns.mjs";
import * as esm_both from /* webpackDefer: true */ "./esm/esm_both.mjs";
import * as esm_both_ns from /* webpackDefer: true */ "./esm/esm_both_ns.mjs";

import * as never from /* webpackDefer: true */ "./esm/esm_both_ns.mjs";

import { reexport_ns, reexport_cjs_ns } from "./esm/reexport.mjs";
import {
	assertTouched as a,
	assertUntouched as b,
	reset as c
} from "./side-effect-counter.js";
const [assertTouched, assertUntouched, reset] = [a, b, c];

it("should defer the module until first use", () => {
	assertUntouched();

	dynamic_default.default;
	assertTouched();
	expect(dynamic_default.default()).toBe("func");
	assertTouched();

	reset();
	dynamic_named.f;
	assertTouched();
	expect(dynamic_named.f()).toBe("func");
	expect(new dynamic_named.T().x).toBe(1);
	assertTouched();

	reset();
	dynamic_both.default;
	assertTouched();
	expect(dynamic_both.default()).toBe("func");
	expect(dynamic_both.default.x).toBe(1);
	expect(new dynamic_both.default.T().x).toBe(1);
	assertTouched();

	// then flagged, without namespace
	reset();
	flagged_default.default;
	assertTouched();
	expect(flagged_default.default()).toBe("func");
	assertTouched();

	reset();
	flagged_named.f;
	assertTouched();
	expect(flagged_named.f()).toBe("func");
	expect(new flagged_named.T().x).toBe(1);
	assertTouched();

	reset();
	flagged_both.default;
	assertTouched();
	expect(flagged_both.default()).toBe("func");
	expect(flagged_both.x).toBe(1);
	expect(new flagged_both.T().x).toBe(1);
	assertTouched();

	// then esm, without namespace
	reset();
	esm_default.default;
	assertTouched();
	expect(esm_default.default()).toBe("func");
	assertTouched();

	reset();
	esm_named.f;
	assertTouched();
	expect(esm_named.f()).toBe("func");
	expect(new esm_named.T().x).toBe(1);
	assertTouched();

	reset();
	esm_both.default;
	assertTouched();
	expect(esm_both.default()).toBe("func");
	expect(esm_both.x).toBe(1);
	expect(new esm_both.T().x).toBe(1);
	assertTouched();

	// then dynamic with namespace
	reset();
	assertIsNamespaceObject(dynamic_default_ns);
	assertUntouched();
	Reflect.get(dynamic_default_ns, "default");
	assertTouched();
	expect(Reflect.get(dynamic_default_ns, "default")()).toBe("func");
	assertTouched();

	reset();
	assertIsNamespaceObject(dynamic_named_ns);
	assertUntouched();
	Reflect.get(dynamic_named_ns, "f");
	assertTouched();
	expect(Reflect.get(dynamic_named_ns, "f")()).toBe("func");
	expect(new dynamic_named_ns.T().x).toBe(1);
	assertTouched();

	reset();
	assertIsNamespaceObject(dynamic_both_ns);
	assertUntouched();
	Reflect.get(dynamic_both_ns, "default");
	assertTouched();
	expect(Reflect.get(dynamic_both_ns, "default")()).toBe("func");
	expect(Reflect.get(dynamic_both_ns, "x")).toBe(1);
	expect(new dynamic_both_ns.T().x).toBe(1);
	assertTouched();

	// then flagged with namespace
	reset();
	assertIsNamespaceObject(flagged_default_ns);
	assertUntouched();
	Reflect.get(flagged_default_ns, "default");
	assertTouched();
	expect(Reflect.get(flagged_default_ns, "default")()).toBe("func");
	assertTouched();

	reset();
	assertIsNamespaceObject(flagged_named_ns);
	assertUntouched();
	Reflect.get(flagged_named_ns, "f");
	assertTouched();
	expect(Reflect.get(flagged_named_ns, "f")()).toBe("func");
	expect(new flagged_named_ns.T().x).toBe(1);
	assertTouched();

	reset();
	assertIsNamespaceObject(flagged_both_ns);
	assertUntouched();
	Reflect.get(flagged_both_ns, "default");
	assertTouched();
	expect(Reflect.get(flagged_both_ns, "default")()).toBe("func");
	expect(Reflect.get(flagged_both_ns, "x")).toBe(1);
	expect(new flagged_both_ns.T().x).toBe(1);
	assertTouched();

	// then esm with namespace
	reset();
	assertIsNamespaceObject(esm_default_ns);
	assertUntouched();
	Reflect.get(esm_default_ns, "default");
	assertTouched();
	expect(Reflect.get(esm_default_ns, "default")()).toBe("func");
	assertTouched();

	reset();
	assertIsNamespaceObject(esm_named_ns);
	assertUntouched();
	Reflect.get(esm_named_ns, "f");
	assertTouched();
	expect(Reflect.get(esm_named_ns, "f")()).toBe("func");
	expect(new esm_named_ns.T().x).toBe(1);
	assertTouched();

	reset();
	assertIsNamespaceObject(esm_both_ns);
	assertUntouched();
	Reflect.get(esm_both_ns, "default");
	assertTouched();
	expect(Reflect.get(esm_both_ns, "default")()).toBe("func");
	expect(Reflect.get(esm_both_ns, "x")).toBe(1);
	expect(new esm_both_ns.T().x).toBe(1);
	assertTouched();

	// then reexported with namespace
	reset();
	assertIsNamespaceObject(reexport_ns);
	assertUntouched();
	Reflect.get(reexport_ns, "f");
	assertTouched();
	expect(Reflect.get(reexport_ns, "f")()).toBe("func");
	expect(new reexport_ns.T().x).toBe(1);
	assertTouched();

	reset();
	assertIsNamespaceObject(reexport_cjs_ns);
	assertUntouched();
	Reflect.get(reexport_cjs_ns, "default");
	Reflect.get(reexport_cjs_ns, "default").f;
	assertTouched();
	expect(Reflect.get(reexport_cjs_ns, "default").f()).toBe("func");
	expect(new reexport_cjs_ns.T().x).toBe(1);
	assertTouched();

	reset();
	assertIsNamespaceObject(never);
	expect((mod => mod.then)(never)).toBeUndefined();
});
function assertIsNamespaceObject(ns) {
	if (typeof ns !== "object" || !ns)
		throw new TypeError("namespace is not an object.");
	if (!ns[Symbol.toStringTag])
		throw new Error(
			"namespace object does not have a Symbol.toStringTag property."
		);
}
