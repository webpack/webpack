import a from "./dep.js"
import b from "./dep1.js"

const global = a``;

it("should generate indirect call", () => {
	expect(a``).toBeUndefined();
	expect(a`${{a}}`).toBeUndefined();
	expect((a)``).toBeUndefined();
	expect(b()``).toBeUndefined();
	expect(global).toBeUndefined();
});
