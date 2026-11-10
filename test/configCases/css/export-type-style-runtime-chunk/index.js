import "./style.css";

it("should inject styles from a chunk without the runtime", () => {
	const styles = Array.from(document.getElementsByTagName("style"));
	expect(styles.some(s => s.textContent.includes("runtime-chunk"))).toBe(true);
});
