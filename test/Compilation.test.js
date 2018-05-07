/* globals describe, it */
"use strict";

const should = require("should");
const sinon = require("sinon");

const Compilation = require("../lib/Compilation");

describe("Compilation", () => {
	describe('sortModules', () => {
		it('should sort modules by index', () => {
			let modules = [
				{index: 5},
				{index: 4},
				{index: 8},
				{index: 1},
			];

			Compilation.prototype.sortModules(modules);
			modules.should.match([
				{index: 1},
				{index: 4},
				{index: 5},
				{index: 8},
			]);
		});
	});
});
