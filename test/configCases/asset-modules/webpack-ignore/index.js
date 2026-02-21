it("should work", async () => {
	const decoder = new TextDecoder("utf-8");

	const textFile = (await import(/* webpackIgnore: true */ "./file.text", { with: { type: "bytes" } })).default;
	const textFileContent = decoder.decode(textFile);

	expect(textFileContent.trim()).toBe("a Ā 𐀀 文 🦄 Text");

	const jsonFile = (await import(/* webpackIgnore: true */ "./file.json", { with: { type: "bytes" } })).default;
	const jsonFileContent = decoder.decode(jsonFile);

	expect(JSON.parse(jsonFileContent.trim())).toStrictEqual({ foo: "bar" });

	const jsFile = (await import(/* webpackIgnore: true */ "./file.js", { with: { type: "bytes" } })).default;
	const jsFileContent = decoder.decode(jsFile);

	expect(jsFileContent.trim()).toBe("export default \"test\";");

	const cssFile = (await import(/* webpackIgnore: true */ "./file.css", { with: { type: "bytes" } })).default;
	const cssFileContent = decoder.decode(cssFile);

	expect(cssFileContent.trim()).toBe("body { color: red; }");

	const htmlFile = (await import(/* webpackIgnore: true */ "./file.html", { with: { type: "bytes" } })).default;
	const htmlFileContent = decoder.decode(htmlFile);

	expect(htmlFileContent.trim()).toBe("<div>test</div>");
});
