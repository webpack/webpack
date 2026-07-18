import a from /* webpackDefer: 42 */ "./mod.js";
import b from /* webpackSource: 42 */ "./mod.js";
import c from /* webpackDefer: [ */ "./mod.js";

it("should warn on invalid phase magic comments and import normally", () => {
	expect(a).toBe(42);
	expect(b).toBe(42);
	expect(c).toBe(42);
});
