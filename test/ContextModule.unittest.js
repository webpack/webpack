"use strict";

const ContextModule = require("../lib/ContextModule");

describe("contextModule", () => {
	let contextModule;
	/** @type {string} */
	let request;

	beforeEach(() => {
		request = "/some/request";
	});

	describe("#identifier", () => {
		it("returns an safe identifier for this module", () => {
			contextModule = new ContextModule(
				() => {},
				/** @type {import("../lib/ContextModule").ContextModuleOptions} */ (
					/** @type {unknown} */ ({
						type: "javascript/auto",
						request,
						resource: "a",
						mode: "lazy",
						regExp: /a|b/
					})
				)
			);
			expect(contextModule.identifier()).toEqual(
				expect.stringContaining("/a%7Cb/")
			);
		});
	});

	describe("getGlobImportPropertyAccess", () => {
		/** @type {import("../lib/ContextModule").ContextModuleOptions} */
		const baseOptions = {
			resource: "a",
			mode: "sync",
			recursive: false,
			regExp: false
		};

		it("returns undefined when globImport is missing, empty, or '*'", () => {
			contextModule = new ContextModule(() => {}, baseOptions);
			expect(contextModule.getGlobImportPropertyAccess()).toBeUndefined();

			contextModule = new ContextModule(() => {}, {
				...baseOptions,
				globImport: "*"
			});
			expect(contextModule.getGlobImportPropertyAccess()).toBeUndefined();
		});

		it("uses dot access for safe identifier export names", () => {
			contextModule = new ContextModule(() => {}, {
				...baseOptions,
				globImport: "namedExport"
			});
			expect(contextModule.getGlobImportPropertyAccess()).toBe(".namedExport");
		});

		it("uses bracket access for non-identifier export names", () => {
			contextModule = new ContextModule(() => {}, {
				...baseOptions,
				globImport: "foo-bar"
			});
			expect(contextModule.getGlobImportPropertyAccess()).toBe('["foo-bar"]');
		});

		it("uses bracket access for reserved export names", () => {
			contextModule = new ContextModule(() => {}, {
				...baseOptions,
				globImport: "default"
			});
			expect(contextModule.getGlobImportPropertyAccess()).toBe('["default"]');
		});
	});
});
