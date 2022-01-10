import fs from "fs";
import path from "path";

it("should lead to conflicting order warning", done => {
	__non_webpack_require__("./lazy4_js.bundle0.js");
	Promise.all([
		import("./lazy1.css"),
		import("./lazy2.css"),
		import("./lazy3.css"),
		import("./lazy4.js")
	]).then(() => {
		try {
			const matches = fs
				.readFileSync(path.join(__dirname, "css.bundle0.css"), "utf-8")
				.match(/color: ([a-z0-9])/g)
				.map(match => match[7]);
			expect(matches).toEqual("bcdea123".split(""));
			done();
		} catch (e) {
			done(e);
		}
	}, done);
});
