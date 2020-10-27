import { f } from "./shared";

export function test(next, done) {
	expect(f()).toBe(42);
	next(() => {
		expect(f()).toBe(43);
		done();
	});
}
