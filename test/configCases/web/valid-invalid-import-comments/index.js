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

it("should not process invalid webpack import() option comments", (done) => {
	__webpack_nonce__ = "nonce";
	__webpack_public_path__ = "/public/path/";

	const promise = import(/* webpackChunkName: "chunk1" */ "./chunk1");
	expect(document.head._children).toHaveLength(1);
	const script = document.head._children[0];
	expect(script._type).toBe("script");
	expect(script.src).toBe("/public/path/chunk1.js")
	expect(script.getAttribute("nonce")).toBe("nonce")
	expect(script.crossOrigin).toBe("anonymous");
	expect(script.onload).toBeTypeOf("function");

	__non_webpack_require__("./chunk1.js");
	script.onload();
	return promise.then((ex) => {
        // making sure the chunk with valid options is still being loaded
		expect(document.head._children).toHaveLength(2);

		let link = document.head._children[1];
		expect(link._type).toBe("link");
		expect(link.rel).toBe("prefetch");
		expect(link.href).toBe("/public/path/goingToCompileChunkName-b.js");
		done();
	}, done);
})

