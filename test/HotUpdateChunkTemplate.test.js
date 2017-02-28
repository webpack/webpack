"use strict";

const should = require("should");
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
			env.renderContext.renderChunkModules.callCount.should.be.exactly(1);
		});

		it("applies modules plugins", () => {
			env.pluginsCall.callCount.should.be.exactly(2);
			env.pluginsCall.firstCall.args[0].should.be.exactly("modules");
		});

		it("applies render plugins", () => {
			env.pluginsCall.callCount.should.be.exactly(2);
			env.pluginsCall.secondCall.args[0].should.be.exactly("render");
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
			env.hash.update.callCount.should.be.exactly(2);
			env.hash.update.firstCall.args[0].should.be.exactly("HotUpdateChunkTemplate");
			env.hash.update.secondCall.args[0].should.be.exactly("1");
		});

		it("applies hash plugin", () => {
			env.updateHashContext.applyPlugins.callCount.should.be.exactly(1);
			env.updateHashContext.applyPlugins.firstCall.args[0].should.be.exactly("hash");
			env.updateHashContext.applyPlugins.firstCall.args[1].should.be.exactly(env.hash);
		});
	});
});
