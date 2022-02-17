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
				mode: "lazy",
				regExp: /a|b/
			});
			expect(contextModule.identifier()).toContain("/a%7Cb/");
		});
	});
});
