const fs = __non_webpack_require__("fs");

/**
 * @param {string} type tag name
 * @param {string} file the end of its url
 * @returns {any} the element the runtime put in the document
 */
const find = (type, file) =>
	document.head._children.find(
		(child) =>
			child._type === type && (child.src || child.href || "").endsWith(file)
	);

it("should load chunks with the runtime the environment allows", () => {
	const source = fs.readFileSync(__dirname + "/bundle0.js", "utf-8");
	expect(source).toContain("Object.assign(__webpack_require__.m, moreModules);");
	expect(source).toContain('of document.getElementsByTagName("script")) {');
	expect(source).toContain('of document.getElementsByTagName("link")) {');
	expect(source).toContain("script.remove();");
	expect(source).toContain("document.head.append(script);");
	expect(source).toContain('if(event.type != "load") link.remove()');
});

it("should install a loaded chunk and take its script out", async () => {
	const promise = import(/* webpackChunkName: "chunk" */ "./chunk");
	const script = find("script", "chunk.js");
	expect(script.parentNode).toBe(document.head);
	__non_webpack_require__("./chunk.js");
	script.onload({ type: "load", target: script });
	expect(script.parentNode).toBeUndefined();
	expect((await promise).default).toBe("chunk");
});

it("should take out the stylesheet of a chunk whose styles failed", async () => {
	const promise = import(/* webpackChunkName: "styled" */ "./styled");
	const link = find("link", "styled.css");
	expect(link.parentNode).toBe(document.head);
	link.onerror({ type: "error", target: link });
	expect(link.parentNode).toBeUndefined();
	const script = find("script", "styled.js");
	__non_webpack_require__("./styled.js");
	script.onload({ type: "load", target: script });
	await expect(promise).rejects.toMatchObject({ type: "error" });
});

it("should take out the script of a chunk that failed to load", async () => {
	const promise = import(/* webpackChunkName: "failing" */ "./failing");
	const script = find("script", "failing.js");
	script.onerror({ type: "error", target: script });
	expect(script.parentNode).toBeUndefined();
	await expect(promise).rejects.toMatchObject({
		name: "ChunkLoadError",
		type: "error"
	});
});
