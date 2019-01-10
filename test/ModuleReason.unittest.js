"use strict";

const Module = require("../lib/Module");
const Chunk = require("../lib/Chunk");
const Dependency = require("../lib/Dependency");
const ModuleReason = require("../lib/ModuleReason");

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
		it("returns false when chunk is not present", () => {
			expect(myModuleReason.hasChunk(myChunk)).toBe(false);
		});

		it("returns true when chunk is present", () => {
			myModuleReason.module.addChunk(myChunk);
			expect(myModuleReason.hasChunk(myChunk)).toBe(true);
		});
	});

	describe("rewriteChunks", () => {
		it("if old chunk is present, it is replaced with new chunks", () => {
			myModuleReason.module.addChunk(myChunk);
			myModuleReason.rewriteChunks(myChunk, [myChunk2]);

			expect(myModuleReason.hasChunk(myChunk)).toBe(false);
			expect(myModuleReason.hasChunk(myChunk2)).toBe(true);
		});

		it("if old chunk is not present, new chunks are not added", () => {
			myModuleReason.rewriteChunks(myChunk, [myChunk2]);

			expect(myModuleReason.hasChunk(myChunk)).toBe(false);
			expect(myModuleReason.hasChunk(myChunk2)).toBe(false);
		});

		it("if already rewritten chunk is present, it is replaced with new chunks", () => {
			myModuleReason.module.addChunk(myChunk);
			myModuleReason.rewriteChunks(myChunk, [myChunk2]);
			myModuleReason.rewriteChunks(myChunk2, [myChunk]);

			expect(myModuleReason.hasChunk(myChunk)).toBe(true);
			expect(myModuleReason.hasChunk(myChunk2)).toBe(false);
		});
	});
});
