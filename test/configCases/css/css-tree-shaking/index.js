const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const prod = process.env.NODE_ENV === "production";

it("should tree shake CSS modules", done => {
	const fileName = prod ? "./649.bundle1.js" : "./import-style_js.bundle0.js";

	__non_webpack_require__(fileName);

	import("./import-style.js").then(({ default: x }) => {
		try {
			expect(x).toEqual({
				Button: prod ? "my-app-274-z" : "./style.module.css-Button"
			});
		} catch (e) {
			return done(e);
		}
		done();
	}, done);
});
