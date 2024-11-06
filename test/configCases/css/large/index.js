const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
	prod
		? __non_webpack_require__("./226.bundle1.js")
		: __non_webpack_require__("./use-style_js.bundle0.js");
	import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toMatchSnapshot(prod ? "prod" : "dev");
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});

it("should allow to process tailwind as global css", done => {
	import("./tailwind.min.css").then(() => done(), done);
});
