/* globals describe, it */
"use strict";

const should = require("should");
const WebpackMissingModule = require("../lib/dependencies/WebpackMissingModule");

describe("WebpackMissingModule", () => {
	describe("#moduleCode", () => {
		it("returns an error message based on given error message", () => {
			const errorMessage = WebpackMissingModule.moduleCode("mock message");
			should(errorMessage).be.eql(
				'var e = new Error("Cannot find module \\"mock message\\""); e.code = \'MODULE_NOT_FOUND\'; throw e;'
			);
		});
	});

	describe("#promise", () => {
		it("returns an error message based on given error message", () => {
			const errorMessage = WebpackMissingModule.promise("mock message");
			should(errorMessage).be.eql(
				'Promise.reject(function webpackMissingModule() { var e = new Error("Cannot find module \\"mock message\\""); e.code = \'MODULE_NOT_FOUND\'; return e; }())'
			);
		});
	});

	describe("#module", () => {
		it("returns an error message based on given error message", () => {
			const errorMessage = WebpackMissingModule.module("mock message");
			should(errorMessage).be.eql(
				'!(function webpackMissingModule() { var e = new Error("Cannot find module \\"mock message\\""); e.code = \'MODULE_NOT_FOUND\'; throw e; }())'
			);
		});
	});
});
