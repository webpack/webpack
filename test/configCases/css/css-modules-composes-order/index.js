import * as styles from "./entry.modules.css";

it("orders composes-from-file imports topologically across rules", () => {
	const link = document
		.getElementsByTagName("link")
		.find((l) => l.href.endsWith("bundle0.css"));
	expect(link.sheet.css).toMatchSnapshot();
	expect(styles).toMatchSnapshot();
});
