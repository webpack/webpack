const prod = process.env.NODE_ENV === "production";

it("should allow to create css modules", done => {
	import("../css-modules/use-style.js").then(({ default: x }) => {
		try {
			expect(x).toMatchSnapshot(prod ? "prod" : "dev");
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});

import * as style from "../css-modules/style.module.css";

it("should allow to import css modules", () => {
	expect(style.class).toMatchSnapshot(prod ? "class-prod" : "class-dev");
	expect(style.local1).toMatchSnapshot(prod ? "local1-prod" : "local1-dev");
	expect(style.local2).toMatchSnapshot(prod ? "local2-prod" : "local2-dev");
	expect(style.local3).toMatchSnapshot(prod ? "local3-prod" : "local3-dev");
	expect(style.local4).toMatchSnapshot(prod ? "local4-prod" : "local4-dev");
});
