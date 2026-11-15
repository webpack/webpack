import "./style.css";

it("should build a stylesheet whose url fails", () => {
	expect(__STATS__.errors).toHaveLength(1);
});
