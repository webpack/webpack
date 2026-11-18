it("reports syntax Node.js does not strip as a module error", () => {
	expect(() => require("./enum.ts")).toThrow(
		/TypeScript enum is not supported in strip-only mode/
	);
});
