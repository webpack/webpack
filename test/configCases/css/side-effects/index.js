import "pkg-side-effect-only";
import "pkg-side-effects-true";
import { exportedFromCss, used } from "pkg-with-css";

it("uses the re-exported CSS class through a sideEffects:false re-exporter", () => {
	expect(typeof used).toBe("string");
	expect(used).not.toBe("");
});

it("uses the ICSS :export value forwarded through a sideEffects:false re-exporter", () => {
	expect(exportedFromCss).toBe("hello");
});

it("emits CSS rules from a sideEffects:false package when classes are used", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	// `.used` is referenced from JS, `.unused` is not — both must survive
	// because the rules themselves apply styles globally and the JS-level
	// import connection is kept active by the named-export usage.
	expect(css).toMatch(/color:\s*red/);
	expect(css).toMatch(/color:\s*blue/);
});

// Side-effect-only imports through a `"sideEffects": false` package are
// dropped, matching Vite/Rollup/Rolldown's strict interpretation of the
// `sideEffects` field. Libraries that ship CSS through this pattern need
// to opt CSS in explicitly with `"sideEffects": ["**/*.css"]` (or use a
// `module.rules[].sideEffects` override).
it("drops CSS from a side-effect-only import through a sideEffects:false package", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).not.toMatch(/rebeccapurple/);
});

it("emits CSS imported through a sideEffects:true package", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	expect(css).toMatch(/papayawhip/);
});
