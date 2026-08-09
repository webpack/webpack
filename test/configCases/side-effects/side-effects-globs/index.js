import "bare-star";
import "flag-false";
import "flag-true";
import "globs";
import "single-star";

// Each fixture module pushes its name when it runs, so a dropped one is absent.
// `global`, not `globalThis`: the emitted bundle also runs on Node.js 10.
const evaluated = () => (global.SIDE_EFFECTS || []).sort();

it("should read glob shapes out of a package.json sideEffects array", () => {
	expect(evaluated()).toContain("globs/src/x/y/z");
	expect(evaluated()).toContain("globs/nested/deep/inner");
	expect(evaluated()).toContain("globs/brace/a");
	expect(evaluated()).toContain("globs/range/y");
	// no glob in the array matches these
	expect(evaluated()).not.toContain("globs/brace/c");
	expect(evaluated()).not.toContain("globs/range/w");
	expect(evaluated()).not.toContain("globs/clean");
});

it("should not let a single star cross a path separator", () => {
	expect(evaluated()).toContain("single-star/src/direct");
	expect(evaluated()).not.toContain("single-star/src/deep/nested");
});

it("should match a nested path with a bare `*.js`", () => {
	expect(evaluated()).toContain("bare-star/deep/nested");
});

it("should understand the boolean forms", () => {
	expect(evaluated()).toContain("flag-true/a");
	expect(evaluated()).not.toContain("flag-false/a");
	expect(evaluated()).not.toContain("flag-false/index");
	delete global.SIDE_EFFECTS;
});
