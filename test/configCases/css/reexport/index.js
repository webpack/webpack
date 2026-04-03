import * as styles from "./styles.module.css";

it("should work with asset modules", async () => {
	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /bundle/.test(item.href)).sheet.css).toMatchSnapshot();
	expect(styles).toMatchSnapshot();
});
