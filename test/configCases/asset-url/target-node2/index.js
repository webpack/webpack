const currentDir = require("url").pathToFileURL(__dirname);

it("should handle import.meta.url in URL()", () => {
	const {href} = new URL("./index.css", import.meta.url);

	expect(href).toBe(currentDir + "/index.css");
});
