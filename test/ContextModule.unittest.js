"use strict";

const ContextModule = require("../lib/ContextModule");

describe("contextModule", () => {
	let contextModule;
	let request;
	beforeEach(() => {
		request = "/some/request";
	});
	describe("#identifier", () => {
		it("returns an safe identifier for this module", () => {
			contextModule = new ContextModule(() => {}, {
				type: "javascript/auto",
				request,
				resource: "a",
				mode: "lazy",
				regExp: /a|b/
			});
			expect(contextModule.identifier()).toEqual(
				expect.stringContaining("/a%7Cb/")
			);
		});
	});
});
