const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
	prod
		? __non_webpack_require__("./249.bundle1.js")
		: __non_webpack_require__("./use-style_js.bundle0.js");
	import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toEqual({
				class: prod ? "S_491" : "class_\\.\\/style\\.module\\.css",
				local: prod
					? "Zw_491 yl_491 J__491 gc_491"
					: "local1_\\.\\/style\\.module\\.css local2_\\.\\/style\\.module\\.css local3_\\.\\/style\\.module\\.css local4_\\.\\/style\\.module\\.css"
			});
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
