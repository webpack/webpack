/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../lib/RuntimeGlobals");
const webpackGlobals = require("../lib/globals");

describe("webpack/globals", () => {
	it("should export all RuntimeGlobals", () => {
		const expectedGlobals = Object.keys(RuntimeGlobals);
		const exportedGlobals = Object.keys(webpackGlobals);

		expect(exportedGlobals).toEqual(expect.arrayContaining(expectedGlobals));
		expect(exportedGlobals.length).toBe(expectedGlobals.length);
	});

	it("should export publicPath global", () => {
		expect(webpackGlobals.publicPath).toBe("__webpack_require__.p");
	});

	it("should export require global", () => {
		expect(webpackGlobals.require).toBe("__webpack_require__");
	});

	it("should export exports global", () => {
		expect(webpackGlobals.exports).toBe("__webpack_exports__");
	});

	it("should export module global", () => {
		expect(webpackGlobals.module).toBe("module");
	});

	it("should export hasOwnProperty global", () => {
		expect(webpackGlobals.hasOwnProperty).toBe("__webpack_require__.o");
	});

	it("should export definePropertyGetters global", () => {
		expect(webpackGlobals.definePropertyGetters).toBe("__webpack_require__.d");
	});

	it("should export makeNamespaceObject global", () => {
		expect(webpackGlobals.makeNamespaceObject).toBe("__webpack_require__.r");
	});

	it("should export ensureChunk global", () => {
		expect(webpackGlobals.ensureChunk).toBe("__webpack_require__.e");
	});

	it("should export moduleCache global", () => {
		expect(webpackGlobals.moduleCache).toBe("__webpack_require__.c");
	});

	it("should export moduleFactories global", () => {
		expect(webpackGlobals.moduleFactories).toBe("__webpack_require__.m");
	});

	it("should export baseURI global", () => {
		expect(webpackGlobals.baseURI).toBe("__webpack_require__.b");
	});

	it("should export runtimeId global", () => {
		expect(webpackGlobals.runtimeId).toBe("__webpack_require__.j");
	});

	it("should export global object reference", () => {
		expect(webpackGlobals.global).toBe("__webpack_require__.g");
	});

	it("should export scriptNonce global", () => {
		expect(webpackGlobals.scriptNonce).toBe("__webpack_require__.nc");
	});

	it("should export chunkCallback global", () => {
		expect(webpackGlobals.chunkCallback).toBe("webpackChunk");
	});

	it("should have all globals as strings", () => {
		Object.values(webpackGlobals).forEach(value => {
			expect(typeof value).toBe("string");
		});
	});

	it("should match RuntimeGlobals exactly", () => {
		expect(webpackGlobals).toEqual(RuntimeGlobals);
	});
});
