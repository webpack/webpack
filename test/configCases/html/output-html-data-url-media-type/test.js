const fs = require("fs");

const chunks = (prefix) =>
	fs
		.readdirSync(__dirname)
		.filter((f) => f.startsWith(prefix) && f.endsWith(".js"));

it("keeps a data:text/htmlx entry chunk, which is not an output.html wrapper", () => {
	expect(chunks("data-url.").length).toBeGreaterThan(0);
});

it("still drops the JS chunk of a real generated page", () => {
	expect(chunks("page.")).toHaveLength(0);
});
