it("should handle import.meta.url in URL()", () => {
	const url = new URL("./index.css?query=yes#fragment", import.meta.url);

	expect(url.href).toBe("public/index.css?query=yes#fragment");
	expect(url.origin).toBe("");
	expect(url.protocol).toBe("");
	expect(url.username).toBe("");
	expect(url.password).toBe("");
	expect(url.host).toBe("");
	expect(url.hostname).toBe("");
	expect(url.port).toBe("");
	expect(url.pathname).toBe("public/index.css");
	expect(url.search).toBe("?query=yes");
	expect(url.searchParams.get("query")).toBe("yes");
	expect(url.hash).toBe("#fragment");
	expect(url + "").toBe("public/index.css?query=yes#fragment");
	expect(url.toString()).toBe("public/index.css?query=yes#fragment");
	expect(JSON.stringify(url)).toBe('"public/index.css?query=yes#fragment"');
	expect(url instanceof URL).toBe(true);
});
