import "./setup";
import "./class-static-field";
import "./class-static-block";
import "./optional-call";
import "./logical-assignment-getter";
import "./nullish-assignment-getter";
import "./pure-class-fields";
import "./pure-optional-function";

const bundled = (name) => `./${name}.js` in __webpack_modules__;

it("should evaluate every module whose export value runs user code", () => {
	const expected = [
		"class-static-field",
		"class-static-block",
		"optional-call",
		"logical-assignment-getter",
		"nullish-assignment-getter"
	];
	expect(expected.filter((name) => !global.cjsModernEffects.includes(name))).toEqual([]);
	expect(expected.filter((name) => !bundled(name))).toEqual([]);
});

it("should drop a module whose class or function bodies never run", () => {
	expect(["pure-class-fields", "pure-optional-function"].filter(bundled)).toEqual([]);
	delete global.cjsModernEffects;
});
