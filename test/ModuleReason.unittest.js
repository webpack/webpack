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
		it("returns false when chunk is not present", () =>
			should(myModuleReason.hasChunk(myChunk)).be.false());

		it("returns true when chunk is present", () => {
			myModuleReason.module.addChunk(myChunk);
			should(myModuleReason.hasChunk(myChunk)).be.true();
		});
	});

	describe("rewriteChunks", () => {
		it("if old chunk is present, it is replaced with new chunks", () => {
			myModuleReason.module.addChunk(myChunk);
			myModuleReason.rewriteChunks(myChunk, [myChunk2]);

			should(myModuleReason.hasChunk(myChunk)).be.false();
			should(myModuleReason.hasChunk(myChunk2)).be.true();
		});

		it("if old chunk is not present, new chunks are not added", () => {
			myModuleReason.rewriteChunks(myChunk, [myChunk2]);

			should(myModuleReason.hasChunk(myChunk)).be.false();
			should(myModuleReason.hasChunk(myChunk2)).be.false();
		});

		it("if already rewritten chunk is present, it is replaced with new chunks", () => {
			myModuleReason.module.addChunk(myChunk);
			myModuleReason.rewriteChunks(myChunk, [myChunk2]);
			myModuleReason.rewriteChunks(myChunk2, [myChunk]);

			should(myModuleReason.hasChunk(myChunk)).be.true();
			should(myModuleReason.hasChunk(myChunk2)).be.false();
		});
	});
});
