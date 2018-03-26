/* globals describe, it, beforeEach */
"use strict";
require("should");
const DelegatedModule = require("../lib/DelegatedModule");

describe("DelegatedModule", function() {
	describe("#updateHash", function() {
		const sourceRequest = "dll-reference dll_e54c0fb67f8152792ad2";
		const data = {
			id: "/xg9"
		};
		const type = "require";
		const userRequest = "./library.js";
		let hashedText;
		let hash;
		beforeEach(function() {
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
		it("updates hash with delegated module ID", function() {
			hashedText.should.containEql("/xg9");
		});
		it("updates hash with delegation type", function() {
			hashedText.should.containEql("require");
		});
	});
});
