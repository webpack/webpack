"use strict";

const RemoteModule = require("../lib/container/RemoteModule");

describe("RemoteModule", () => {
	let module;
	const request = "my-remote/module";
	const externalRequests = ["remote1@https://example.com/remote1.js"];
	const internalRequest = "./module";
	const shareScope = "default";

	beforeEach(() => {
		module = new RemoteModule(
			request,
			externalRequests,
			internalRequest,
			shareScope
		);
		module.buildMeta = {};
		module.buildInfo = { strict: true };
	});

	describe("#getExportsType", () => {
		it('returns "dynamic" regardless of strict parameter', () => {
			const mockModuleGraph = {};

			expect(module.getExportsType(mockModuleGraph, false)).toBe("dynamic");

			expect(module.getExportsType(mockModuleGraph, true)).toBe("dynamic");
		});

		it('returns "dynamic" to enable runtime __esModule check', () => {
			const mockModuleGraph = {};
			const exportsType = module.getExportsType(mockModuleGraph, true);

			expect(exportsType).toBe("dynamic");
		});
	});
});
