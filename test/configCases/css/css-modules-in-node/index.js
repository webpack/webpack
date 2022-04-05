const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
	import("../css-modules/use-style.js").then(({ default: x }) => {
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
					: "./style.module.css-nested1 undefined ./style.module.css-nested3",
				ident: prod ? "my-app-491-yR" : "./style.module.css-ident",
				keyframes: prod ? "my-app-491-y3" : "./style.module.css-localkeyframes",
				animation: prod ? "my-app-491-oQ" : "./style.module.css-animation",
				vars: prod
					? "--my-app-491-y4 my-app-491-gR undefined my-app-491-xk"
					: "--./style.module.css-local-color ./style.module.css-vars undefined ./style.module.css-globalVars"
			});
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});

import * as style from "../css-modules/style.module.css";

it("should allow to import css modules", () => {
	expect(style.class).toBe(prod ? "my-app-491-S" : "./style.module.css-class");
	expect(style.local1).toBe(
		prod ? "my-app-491-Zw" : "./style.module.css-local1"
	);
	expect(style.local2).toBe(
		prod ? "my-app-491-yl" : "./style.module.css-local2"
	);
	expect(style.local3).toBe(
		prod ? "my-app-491-J_" : "./style.module.css-local3"
	);
	expect(style.local4).toBe(
		prod ? "my-app-491-gc" : "./style.module.css-local4"
	);
});
