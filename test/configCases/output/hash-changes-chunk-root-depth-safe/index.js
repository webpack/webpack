it("should resolve the public path to the output root", () => {
	expect(new URL(__webpack_public_path__).href).toBe("https://test.cases/path/");
});

export const load = () => import("./lazy");
