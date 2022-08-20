it("should allow to dynamic import a css module", done => {
	import("./style.module.css").then(x => {
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
	__non_webpack_require__("./reexported_js.bundle0.js");
	import("./reexported").then(x => {
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
	__non_webpack_require__("./imported_js.bundle0.js");
	import("./imported").then(({ default: x }) => {
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
