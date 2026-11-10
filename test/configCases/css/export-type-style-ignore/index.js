import "./style.css";

it("should compile and inject styles even when @import is ignored", () => {
	const styles = Array.from(document.getElementsByTagName("style"));
	expect(styles.some(s => s.textContent.includes(".test"))).toBe(true);
});
