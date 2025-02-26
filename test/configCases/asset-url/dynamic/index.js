it("should handle import.meta.url in URL()", () => {
    __webpack_dynamic_public_path__ = (filename, publicPath) => publicPath + "hey/" + filename
	const url = new URL("./index.css?query=yes#fragment", import.meta.url);

	expect(url.href).toBe("public/hey/index.css?query=yes#fragment");
	expect(url.origin).toBe("");
	expect(url.protocol).toBe("");
	expect(url.username).toBe("");
	expect(url.password).toBe("");
	expect(url.host).toBe("");
	expect(url.hostname).toBe("");
	expect(url.port).toBe("");
	expect(url.pathname).toBe("public/hey/index.css");
	expect(url.search).toBe("?query=yes");
	expect(url.searchParams.get("query")).toBe("yes");
	expect(url.hash).toBe("#fragment");
	expect(url + "").toBe("public/hey/index.css?query=yes#fragment");
	expect(url.toString()).toBe("public/hey/index.css?query=yes#fragment");
	expect(JSON.stringify(url)).toBe('"public/hey/index.css?query=yes#fragment"');
	expect(url instanceof URL).toBe(true);
});
