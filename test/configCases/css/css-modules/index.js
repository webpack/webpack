const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
	prod
		? __non_webpack_require__("./249.bundle1.js")
		: __non_webpack_require__("./use-style_js.bundle0.js");
	import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toEqual({
				global: undefined,
				class: prod ? "S_491" : "class_\\.\\/style\\.module\\.css",
				local: prod
					? "Zw_491 yl_491 J__491 gc_491"
					: "local1_\\.\\/style\\.module\\.css local2_\\.\\/style\\.module\\.css local3_\\.\\/style\\.module\\.css local4_\\.\\/style\\.module\\.css",
				local2: prod
					? "Xg_491 AY_491"
					: "local5_\\.\\/style\\.module\\.css local6_\\.\\/style\\.module\\.css",
				nested: prod
					? "RX_491 undefined X2_491"
					: "nested1_\\.\\/style\\.module\\.css undefined nested3_\\.\\/style\\.module\\.css"
			});
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
