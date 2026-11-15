it("namespace: should allow to create namespace exports via __esModule on exports", async () => {
	expect(await import("./namespace-via-exports")).toBe(
		require("./namespace-via-exports")
	);
});
it("namespace: should allow to create namespace exports via __esModule on literal", async () => {
	expect(await import("./namespace-via-literal")).toBe(
		require("./namespace-via-literal")
	);
});
it("namespace: should allow to create namespace exports via __esModule with Object.defineProperty", async () => {
	expect(await import("./namespace-via-define-property")).toBe(
		require("./namespace-via-define-property")
	);
});
it("namespace: should allow to create namespace exports via __esModule with Object.defineProperty minimized true", async () => {
	expect(await import("./namespace-via-define-property-minimized")).toBe(
		require("./namespace-via-define-property-minimized")
	);
});
it("namespace: should allow to create namespace exports via __esModule with Object.defineProperties", async () => {
	expect(await import("./namespace-via-define-properties")).toBe(
		require("./namespace-via-define-properties")
	);
});
