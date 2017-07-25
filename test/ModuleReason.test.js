"use strict";

const Module = require("../lib/Module");
const Chunk = require("../lib/Chunk");
const Dependency = require("../lib/Dependency");
const ModuleReason = require("../lib/ModuleReason");
const should = require("should");

describe("ModuleReason", () => {
	let myModule;
	let myDependency;
	let myModuleReason;
	let myChunk;
	let myChunk2;

	beforeEach(() => {
		myModule = new Module();
		myDependency = new Dependency();
		myChunk = new Chunk("chunk-test", "module-test", "loc-test");
		myChunk2 = new Chunk("chunk-test", "module-test", "loc-test");

		myModuleReason = new ModuleReason(myModule, myDependency);
	});

	describe("hasChunk", () => {
		it("returns false when chunk is not present", () => should(myModuleReason.hasChunk(myChunk)).be.false());

		it("returns true when chunk is present", () => {
			myModuleReason.module.addChunk(myChunk);
			should(myModuleReason.hasChunk(myChunk)).be.true();
		});
	});
});
