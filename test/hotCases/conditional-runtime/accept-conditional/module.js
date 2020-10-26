import { f } from "./shared";

export function test(done) {
	expect(f()).toBe(42);
	NEXT(
		require("../../update")(done, undefined, () => {
			expect(f()).toBe(43);
			done();
		})
	);
}
