import "./style.css";

it("should skip an ignored @import", () => {
	const styles = Array.from(document.getElementsByTagName("style"));
	expect(styles.some(s => s.textContent.includes("ignored-import"))).toBe(true);
});
