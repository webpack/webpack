import { getEnums } from "./provider";
import { enumsNs } from "./reexport";
import { getCjs } from "./cjs-provider";
import { direct } from "./consumer";
import { read } from "./destr";
import { getDelNs, delMissing } from "./del";
import fs from "fs";

it("should keep escaped namespace access working while mangling the exports", () => {
	const ns = getEnums();
	expect(ns.ENUM_A).toBe("a-value");
	expect(ns.ENUM_B).toBe("b-value");
	expect(ns.ENUM_C).toBe("c-value");
	expect(ns.default).toBe("default-value");
	// inlinable const must still be reachable by its original name on the escape
	expect(ns.NUM).toBe(42);
	expect(direct).toBe("a-value");
});

it("should keep an escaped re-exported (export * as) namespace working", () => {
	const get = () => enumsNs;
	const ns = get();
	expect(ns.ENUM_A).toBe("a-value");
	expect(ns.default).toBe("default-value");
});

it("should keep destructuring working for a module that also escapes", () => {
	expect(read()).toBe("b-value");
});

it("should keep `delete ns.member` valid when the namespace escapes", () => {
	// Deleting non-existent members of a namespace returns true (per spec) and
	// must not be emitted as a bare `delete undefined`.
	expect(delMissing()).toEqual([true, true]);
	const ns = getDelNs();
	expect(ns.DEL_A).toBe("del-a");
	expect(ns.DEL_B).toBe("del-b");
});

it("should keep a dynamically imported escaping namespace correct", async () => {
	const ns = await import("./dynamic");
	const whole = ns;
	expect(whole.DYN_A).toBe("dyn-a");
	expect(whole.DYN_B).toBe("dyn-b");
});

it("should keep an escaped CommonJS namespace interop correct", () => {
	const ns = getCjs();
	expect(ns.CJS_A).toBe("cjs-a");
	expect(ns.CJS_B).toBe("cjs-b");
});

it("should expose the original names when enumerating an escaped namespace", () => {
	const ns = getEnums();
	const keys = Object.keys(ns);
	expect(keys).toContain("ENUM_A");
	expect(keys).toContain("ENUM_B");
	expect(keys).toContain("ENUM_C");
});

it("should mangle the escaping module's exports", () => {
	const bundle = fs.readFileSync(__filename, "utf-8");
	// Build needles dynamically so this test's own source doesn't appear
	// verbatim in the inspected bundle.
	const a = `ENUM${"_"}A`;
	// The raw export of enums.js must not be defined under its original name.
	expect(bundle.includes(`"${a}", 0`)).toBe(false);
	// The materialized namespace object must expose the original name.
	expect(bundle.includes(`${a}: () =>`)).toBe(true);
});
