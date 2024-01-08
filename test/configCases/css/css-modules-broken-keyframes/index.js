const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
	prod
		? __non_webpack_require__("./249.bundle0.js")
		: __non_webpack_require__("./use-style_js.bundle0.js");
	import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toEqual({
				class: prod ? "my-app-274-S" : "./style.module.css-class",
			});
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
