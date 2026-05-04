import * as styles from "./style.module.css";

it("should HMR a CSS module that uses composes", (done) => {
	expect(styles).toMatchObject({
		button: "style_module_css-button shared_module_css-shared"
	});

	const links = window.document.getElementsByTagName("link");
	expect(links[0].sheet.css).toContain("color: red;");

	NEXT(
		require("../../update")(done, true, () => {
			const updatedLinks = window.document.getElementsByTagName("link");
			expect(updatedLinks[0].sheet.css).toContain("color: green;");
			expect(styles).toMatchObject({
				button: "style_module_css-button shared_module_css-shared"
			});
			done();
		})
	);
});
