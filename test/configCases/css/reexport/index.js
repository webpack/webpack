import * as styles from "./styles.module.css";

it("should work with asset modules", async () => {
	const links = [...document.getElementsByTagName("link")];

	expect(links.find((item) => /bundle0/.test(item.href)).sheet.css).toMatchSnapshot();
	expect(styles).toMatchSnapshot();
});
