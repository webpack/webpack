const FakeDocument = require("../../../helpers/FakeDocument");

let oldNonce;
let oldPublicPath;

beforeEach(() => {
	oldNonce = __webpack_nonce__;
	oldPublicPath = __webpack_public_path__;
	global.document = new FakeDocument(undefined, false);
	global.window = {};
});

afterEach(() => {
	delete global.document;
	delete global.window;
	__webpack_nonce__ = oldNonce;
	__webpack_public_path__ = oldPublicPath;
})

it("should prefetch and preload child chunks on chunk load", (done) => {
	__webpack_nonce__ = "nonce";
	__webpack_public_path__ = "/public/path/";

	const promise = import(/* webpackChunkName: "chunk1" */ "./chunk1");
	expect(document.head._children).toHaveLength(2);
	const script = document.head._children[0];
	expect(script._type).toBe("script");
	expect(script.src).toBe("/public/path/chunk1.js")
	expect(script.getAttribute("nonce")).toBe("nonce")
	expect(script.crossOrigin).toBe("anonymous");
	expect(script.onload).toBeTypeOf("function");

	let link = document.head._children[1];
	expect(link._type).toBe("link");
	expect(link.rel).toBe("preload");
	expect(link.as).toBe("script");
	expect(link.href).toBe("/public/path/chunk1-b.js");
	expect(link.charset).toBe("utf-8");
	expect(link.getAttribute("nonce")).toBe("nonce");
	expect(link.crossOrigin).toBe("anonymous");

	__non_webpack_require__("./chunk1.js");
	script.onload();

	return promise.then((ex) => {
		expect(document.head._children).toHaveLength(4);

		let link = document.head._children[2];
		expect(link._type).toBe("link");
		expect(link.rel).toBe("prefetch");
		expect(link.href).toBe("/public/path/chunk1-c.js");

		link = document.head._children[3];
		expect(link._type).toBe("link");
		expect(link.rel).toBe("prefetch");
		expect(link.href).toBe("/public/path/chunk1-a.js");
		done();
	}, done);
})
