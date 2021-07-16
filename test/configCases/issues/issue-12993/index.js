export const main = "main";

it("library output should be accurate value", async () => {
	expect(global.lib).toEqual(nsObj({ main: "main" }));
	await import(/* webpackPrefetch: true */ "./dynamic.js");
});
