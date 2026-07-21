const fs = require("fs");
const path = require("path");

it("should include an auto-preconnect descriptor in the resource-hints manifest", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "hints.json"), "utf-8")
	);
	const preconnect = manifest.home.find((h) => h.rel === "preconnect");
	expect(preconnect).toBeDefined();
	expect(preconnect.href).toBe("https://cdn.example.com");
	// No crossOriginLoading configured → no crossorigin on the descriptor.
	expect(preconnect.crossorigin).toBeUndefined();
});
