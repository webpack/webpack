import * as styles from "./style.module.css";

it("should work", async function (done) {
	expect(styles).toMatchObject({ class: "_style_module_css-class" });

	const styles2 = await import("./style2.module.css");

	expect(styles2).toMatchObject({
		foo: "_style2_module_css-foo"
	});

	module.hot.accept(["./style.module.css", "./style2.module.css"], () => {
		expect(styles).toMatchObject({
			"class-other": "_style_module_css-class-other"
		});
		import("./style2.module.css").then(styles2 => {
			expect(styles2).toMatchObject({
				"bar": "_style2_module_css-bar"
			});

			done();
		});
	});

	NEXT(require("../../update")(done));
});

module.hot.accept();
