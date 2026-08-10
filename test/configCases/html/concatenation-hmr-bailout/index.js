import html from "./page.html";

it("should report why the HTML module cannot be concatenated", () => {
	const module = __STATS__.modules.find((m) => m.name.includes("page.html"));
	expect(module.optimizationBailout).toContainEqual(
		expect.stringContaining("HTML module needs its own module scope for HMR")
	);
});

it("should still render the HTML module's content", () => {
	expect(html).toContain("<p>hmr page</p>");
});
