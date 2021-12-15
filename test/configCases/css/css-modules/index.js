const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
	prod
		? __non_webpack_require__("./249.bundle1.js")
		: __non_webpack_require__("./use-style_js.bundle0.js");
	import("./use-style.js").then(({ default: x }) => {
		try {
			expect(x).toEqual({
				global: undefined,
				class: prod ? "my-app-491-S" : "./style.module.css-class",
				local: prod
					? "my-app-491-Zw my-app-491-yl my-app-491-J_ my-app-491-gc"
					: "./style.module.css-local1 ./style.module.css-local2 ./style.module.css-local3 ./style.module.css-local4",
				local2: prod
					? "my-app-491-Xg my-app-491-AY"
					: "./style.module.css-local5 ./style.module.css-local6",
				nested: prod
					? "my-app-491-RX undefined my-app-491-X2"
					: "./style.module.css-nested1 undefined ./style.module.css-nested3"
			});
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
