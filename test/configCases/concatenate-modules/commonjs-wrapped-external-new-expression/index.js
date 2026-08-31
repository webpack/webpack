import { readFileSync } from "fs";
import { make, raw } from "./mid.cjs";

it("should apply `new` to a wrapped external's accessor result", () => {
	const emitter = make();

	expect(emitter).toBeInstanceOf(raw);
	expect(typeof emitter.on).toBe("function");
});

it("should really reach the external through a wrapper accessor", () => {
	const source = readFileSync(__filename, "utf-8");

	expect(source).toMatch(
		/external_events_namespaceFn = \/\*#__PURE__\*\/__webpack_require__\.cw\(/
	);
	expect(source).toMatch(/return new \(external_events_namespaceFn\(\)\)\(\)/);
});
