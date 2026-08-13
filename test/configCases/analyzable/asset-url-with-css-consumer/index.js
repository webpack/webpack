import "./s.css";

const url = new URL("./img.png", import.meta.url);

it("should not bake a css-only placeholder into javascript", () => {
	expect(url.href.endsWith("/img.png")).toBe(true);
	expect(url.href).not.toContain("WEBPACK_CSS");
});
