import * as styles from "./style.module.css";
import update from "../../update.esm";

import.meta.webpackHot.accept(["./style.module.css", "./style2.module.css"])

it("should work", async function (done) {
	expect(styles).toMatchObject({ class: "_style_module_css-class" });
	const styles2 = await import("./style2.module.css");

	expect(styles2).toMatchObject({
		foo: "_style2_module_css-foo"
	});

	NEXT(update(done, true, () => {
		Promise.all([
			import("./style.module.css"),
			import("./style2.module.css")
		])
		.then(([styles, styles2]) => {
			expect(styles).toMatchObject({
			"class-other": "_style_module_css-class-other"
			});
			expect(styles2).toMatchObject({
				"bar": "_style2_module_css-bar"
			});

			done();
		}).catch(done);
	}));
});