"use strict";

const SyncHook = require("tapable").SyncHook;
const ContextReplacementPlugin = require("../lib/ContextReplacementPlugin");
const NormalModuleReplacementPlugin = require("../lib/NormalModuleReplacementPlugin");

const UNC_FILE = "\\\\server\\share\\replacement.js";
const UNC_DIRECTORY = "\\\\server\\share\\replacement";

describe("replacement plugins", () => {
	it("keeps an absolute UNC normal-module replacement", () => {
		const normalModuleFactory = {
			hooks: {
				beforeResolve: new SyncHook(["result"]),
				afterResolve: new SyncHook(["result"])
			}
		};
		const compiler = {
			hooks: { normalModuleFactory: new SyncHook(["normalModuleFactory"]) },
			inputFileSystem: {}
		};
		new NormalModuleReplacementPlugin(/original\.js$/, UNC_FILE).apply(
			/** @type {import("../lib/Compiler")} */ (
				/** @type {unknown} */ (compiler)
			)
		);
		compiler.hooks.normalModuleFactory.call(normalModuleFactory);
		const result = { createData: { resource: "/source/original.js" } };

		normalModuleFactory.hooks.afterResolve.call(result);

		expect(result.createData.resource).toBe(UNC_FILE);
	});

	it("keeps an absolute UNC context replacement", () => {
		const contextModuleFactory = {
			hooks: {
				beforeResolve: new SyncHook(["result"]),
				afterResolve: new SyncHook(["result"])
			}
		};
		const compiler = {
			hooks: { contextModuleFactory: new SyncHook(["contextModuleFactory"]) },
			inputFileSystem: {}
		};
		new ContextReplacementPlugin(/original$/, UNC_DIRECTORY).apply(
			/** @type {import("../lib/Compiler")} */ (
				/** @type {unknown} */ (compiler)
			)
		);
		compiler.hooks.contextModuleFactory.call(contextModuleFactory);
		const result = { resource: "/source/original", dependencies: [] };

		contextModuleFactory.hooks.afterResolve.call(result);

		expect(result.resource).toBe(UNC_DIRECTORY);
	});

	it("keeps an absolute UNC context replacement from a callback", () => {
		const contextModuleFactory = {
			hooks: {
				beforeResolve: new SyncHook(["result"]),
				afterResolve: new SyncHook(["result"])
			}
		};
		const compiler = {
			hooks: { contextModuleFactory: new SyncHook(["contextModuleFactory"]) },
			inputFileSystem: {}
		};
		new ContextReplacementPlugin(/original$/, (result) => {
			if ("resource" in result) result.resource = UNC_DIRECTORY;
		}).apply(
			/** @type {import("../lib/Compiler")} */ (
				/** @type {unknown} */ (compiler)
			)
		);
		compiler.hooks.contextModuleFactory.call(contextModuleFactory);
		const result = { resource: "/source/original", dependencies: [] };

		contextModuleFactory.hooks.afterResolve.call(result);

		expect(result.resource).toEqual([UNC_DIRECTORY]);
	});
});
