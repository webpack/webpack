__webpack_public_path__ = "https://test.cases/path/";

const doJsImport = () => import(/* webpackChunkName: "chunk1" */ "./chunk1.js");
const doCssImport = () => import( /* webpackChunkName: "chunk1" */ "./chunk1.css" );

it("should not add charset attribute", async () => {
	const promise = doJsImport();
	expect(document.head._children).toHaveLength(3);

	const link = document.head._children[0];

	expect(link._type).toBe("link");
	expect(link.href).toBe("https://test.cases/path/chunk1.css");
	expect(link.rel).toBe("stylesheet");
	expect(link.getAttribute("charset")).toBeUndefined();

	const script = document.head._children[document.head._children.length - 1];

	__non_webpack_require__("./chunk1.js");
	script.onload();

	expect(script._type).toBe("script");
	expect(script.src).toBe("https://test.cases/path/chunk1.js");
	expect(script.getAttribute("charset")).toBeUndefined();

	return promise.then(() => doCssImport);
});
