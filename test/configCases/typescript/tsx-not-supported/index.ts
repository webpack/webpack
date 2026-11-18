it("asks for a TSX-capable loader for a .tsx module", () => {
	expect(() => require("./component.tsx")).toThrow(/does not support \.tsx\/JSX/);
});
