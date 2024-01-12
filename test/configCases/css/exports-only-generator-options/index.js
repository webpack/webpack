import * as style from "../exports/style.module.css?ns";
import { a, abc } from "../exports/style.module.css?picked";
import def from "../exports/style.module.css?default";

it("should allow to import a css module", () => {
	expect(style).toEqual(
		nsObj({
			a: "a",
			abc: "a b c",
			comments: "abc      def",
			"white space": "abc\n\tdef",
			default: "default"
		})
	);
	expect(a).toBe("a");
	expect(abc).toBe("a b c");
	expect(def).toBe("default");
});

it("should allow to dynamic import a css module", done => {
	__non_webpack_require__("./exports_style_module_css.bundle0.js");
	import("../exports/style.module.css").then(x => {
		try {
			expect(x).toEqual(
				nsObj({
					a: "a",
					abc: "a b c",
					comments: "abc      def",
					"white space": "abc\n\tdef",
					default: "default"
				})
			);
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});

it("should allow to reexport a css module", done => {
	__non_webpack_require__("./exports_reexported_js.bundle0.js");
	import("../exports/reexported").then(x => {
		try {
			expect(x).toEqual(
				nsObj({
					a: "a",
					abc: "a b c",
					comments: "abc      def",
					"white space": "abc\n\tdef"
				})
			);
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});

it("should allow to import a css module", done => {
	__non_webpack_require__("./exports_imported_js.bundle0.js");
	import("../exports/imported").then(({ default: x }) => {
		try {
			expect(x).toEqual(
				nsObj({
					a: "a",
					abc: "a b c",
					comments: "abc      def",
					"white space": "abc\n\tdef",
					default: "default"
				})
			);
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});

it("should not have .css file", async () => {
	const fs = __non_webpack_require__("fs/promises");
	const files = await fs.readdir(__dirname);
	expect(files.every(file => !file.endsWith(".css"))).toBe(true)
})
