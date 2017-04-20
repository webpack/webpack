"use strict";

const sinon = require("sinon");
const HotUpdateChunkTemplate = require("../lib/HotUpdateChunkTemplate");

describe("HotUpdateChunkTemplate", () => {
	let env;

	beforeEach(() => {
		env = {
			myHotUpdateChunkTemplate: new HotUpdateChunkTemplate({})
		};
	});

	describe("render", () => {
		beforeEach(() => {
			env.renderContext = {
				renderChunkModules: sinon.spy(),
				applyPluginsWaterfall: sinon.spy()
			};
			const renderArguments = [
				"id", ["module1", "module2"],
				["module3", "module4"],
				{},
				"moduleTemplate", ["template1"]
			];
			env.myHotUpdateChunkTemplate.render.apply(env.renderContext, renderArguments);
			env.pluginsCall = env.renderContext.applyPluginsWaterfall;
		});

		it("renders chunk modules", () => {
			expect(env.renderContext.renderChunkModules.callCount).toBe(1);
		});

		it("applies modules plugins", () => {
			expect(env.pluginsCall.callCount).toBe(2);
			expect(env.pluginsCall.firstCall.args[0]).toBe("modules");
		});

		it("applies render plugins", () => {
			expect(env.pluginsCall.callCount).toBe(2);
			expect(env.pluginsCall.secondCall.args[0]).toBe("render");
		});
	});

	describe("updateHash", () => {
		beforeEach(() => {
			env.hash = {
				update: sinon.spy()
			};
			env.updateHashContext = {
				applyPlugins: sinon.spy()
			};
			env.myHotUpdateChunkTemplate.updateHash.call(env.updateHashContext, env.hash);
		});

		it("updates hash", () => {
			expect(env.hash.update.callCount).toBe(2);
			expect(env.hash.update.firstCall.args[0]).toBe("HotUpdateChunkTemplate");
			expect(env.hash.update.secondCall.args[0]).toBe("1");
		});

		it("applies hash plugin", () => {
			expect(env.updateHashContext.applyPlugins.callCount).toBe(1);
			expect(env.updateHashContext.applyPlugins.firstCall.args[0]).toBe("hash");
			expect(env.updateHashContext.applyPlugins.firstCall.args[1]).toBe(env.hash);
		});
	});
});
