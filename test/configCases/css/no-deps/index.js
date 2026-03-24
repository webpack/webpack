import "./style.css";

it("should handle CSS modules with no dependencies", () => {
	expect(
		getComputedStyle(document.body).getPropertyValue("background-color").trim()
	).toBe("rgb(1, 2, 3)");
});