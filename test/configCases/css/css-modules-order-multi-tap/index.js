import fs from "fs";
import path from "path";

it("SyncBailHook short-circuits at the first tap that returns a result", done => {
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
			// First tap wins → modules emitted in default name-sorted order.
			expect(matches).toEqual("abcde123".split(""));
			done();
		} catch (e) {
			done(e);
		}
	}, done);
});
