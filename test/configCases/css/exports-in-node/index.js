import * as style from "../pseudo-export/style.module.css?ns";
import { a, abc } from "../pseudo-export/style.module.css?picked";
import def from "../pseudo-export/style.module.css?default";

it("should allow to import a css module", () => {
	expect(style).toEqual(
		nsObj({
			a: "a",
			abc: "a b c",
			comments: "abc/****/   /* hello world *//****/   def",
			whitespace: "abc\n\tdef",
			default: "default"
		})
	);
	expect(a).toBe("a");
	expect(abc).toBe("a b c");
	expect(def).toBe("default");
});

it("should allow to dynamic import a css module", done => {
	import("../pseudo-export/style.module.css").then(x => {
		try {
			expect(x).toEqual(
				nsObj({
					a: "a",
					abc: "a b c",
					comments: "abc/****/   /* hello world *//****/   def",
					whitespace: "abc\n\tdef",
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
	import("../pseudo-export/reexported").then(x => {
		try {
			expect(x).toEqual(
				nsObj({
					a: "a",
					abc: "a b c",
					comments: "abc/****/   /* hello world *//****/   def",
					whitespace: "abc\n\tdef",
				})
			);
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});

it("should allow to import a css module", done => {
	import("../pseudo-export/imported").then(({ default: x }) => {
		try {
			expect(x).toEqual(
				nsObj({
					a: "a",
					abc: "a b c",
					comments: "abc/****/   /* hello world *//****/   def",
					whitespace: "abc\n\tdef",
					default: "default"
				})
			);
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
