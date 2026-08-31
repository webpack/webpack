import { make, raw } from "./mid.cjs";

it("should apply `new` to a wrapped external's accessor result", () => {
	const emitter = make();

	expect(emitter).toBeInstanceOf(raw);
	expect(typeof emitter.on).toBe("function");
});
