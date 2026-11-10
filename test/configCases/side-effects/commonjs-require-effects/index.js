import "./setup";
import "./pure-typescript-getter";
import "./pure-bare-require";
import "./pure-const-require";
import "./pure-transitive";
import "./pure-cycle-a";
import "./pure-require-in-function";
import "./require-effect";
import "./bare-require-effect";
import "./transitive-effect";
import "./cycle-effect-a";
import "./member-read";
import "./ignored-require";
import "./shadowed-require";
import "./esm-require";
import "./require-cache";

require("./pure-bare-require");

const bundled = (name) => `./${name}.js` in __webpack_modules__;

it("should drop a module whose requires load only side-effect-free modules", () => {
	const dropped = [
		"pure-leaf",
		"pure-typescript-getter",
		"pure-bare-require",
		"pure-const-require",
		"pure-transitive",
		"pure-cycle-a",
		"pure-cycle-b",
		"pure-require-in-function"
	];
	expect(dropped.filter(bundled)).toEqual([]);
});

it("should keep a module whose requires load a module with side effects", () => {
	const kept = [
		"require-effect",
		"bare-require-effect",
		"transitive-effect",
		"cycle-effect-a",
		"cycle-effect-b"
	];
	expect(kept.filter((name) => !bundled(name))).toEqual([]);
	expect(global.cjsRequireEffects).toEqual(
		expect.arrayContaining(["effect", "effect-bare", "cycle-effect-b"])
	);
});

it("should keep a module whose require is not webpack's require call", () => {
	const kept = [
		"member-read",
		"ignored-require",
		"shadowed-require",
		"esm-require",
		"require-cache"
	];
	expect(kept.filter((name) => !bundled(name))).toEqual([]);
	expect(global.cjsRequireEffects).toEqual(
		expect.arrayContaining(["getter-leaf", "shadowed-require", "esm-require"])
	);
	delete global.cjsRequireEffects;
});
