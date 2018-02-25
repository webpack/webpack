/* globals describe, it, beforeEach */
"use strict";

const DelegatedModule = require("../lib/DelegatedModule");

describe("DelegatedModule", () => {
	describe("#updateHash", () => {
		const sourceRequest = "dll-reference dll_e54c0fb67f8152792ad2";
		const data = {
			id: "/xg9"
		};
		const type = "require";
		const userRequest = "./library.js";
		let hashedText;
		let hash;
		beforeEach(() => {
			hashedText = "";
			hash = {
				update: text => {
					hashedText += text;
				}
			};
			const delegatedModule = new DelegatedModule(
				sourceRequest,
				data,
				type,
				userRequest
			);
			delegatedModule.updateHash(hash);
		});
		it("updates hash with delegated module ID", () => {
			expect(hashedText).toMatch("/xg9");
		});
		it("updates hash with delegation type", () => {
			expect(hashedText).toMatch("require");
		});
	});
});
