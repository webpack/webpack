// This config need to be set on initial evaluation to be effective
__webpack_nonce__ = "nonce";

it("should prefetch the remote async module", () => {
	__non_webpack_require__("./host-entry.js");

	expect(document.head._children.length).toBe(0);

	return import(/* webpackChunkName: "host-entry" */ "./host-entry")
		.then(module => module.getRemoteModule())
		.then(module => {
			expect(module.default).toBe('remote ./async-module');
			expect(document.head._children.length).toBe(1);

			const link = document.head._children[0];
			expect(link._type).toBe("link");
			expect(link.rel).toBe("prefetch");
			expect(link.as).toBe("script");

			/**
			 * What should this be....?
			 */
			expect(link.href).toBe("remote/async-module.js");

			expect(link.getAttribute("nonce")).toBe("nonce");
			expect(link.crossOrigin).toBe("anonymous");
		});
});