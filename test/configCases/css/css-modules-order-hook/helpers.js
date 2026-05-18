import fs from "fs";
import path from "path";

export function expectCssOrder(variant, idx, expected, done) {
	__non_webpack_require__(`./${variant}-lazy4_js.bundle${idx}.js`);
	Promise.all([
		import("./lazy1.css"),
		import("./lazy2.css"),
		import("./lazy3.css"),
		import("./lazy4.js")
	]).then(() => {
		try {
			const matches = fs
				.readFileSync(
					path.join(__dirname, `${variant}-css.bundle${idx}.css`),
					"utf-8"
				)
				.match(/color: ([a-z0-9])/g)
				.map(match => match[7]);
			expect(matches).toEqual(expected.split(""));
			done();
		} catch (e) {
			done(e);
		}
	}, done);
}
