/* global describe, beforeEach, it */
"use strict";

const should = require("should");
const TemplatePluginEnvironment = require("./helpers/TemplatePluginEnvironment");
const ConcatSource = require("webpack-sources").ConcatSource;
const UmdMainTemplatePlugin = require("../lib/UmdMainTemplatePlugin");

describe("UmdMainTemplatePlugin", () => {

	const setupBasicTemplatePlugin = name => {
		const plugin = new UmdMainTemplatePlugin({
			amd: name
		}, {
			auxiliaryComment: {}
		});
		const templatePlugin = new TemplatePluginEnvironment();
		const environment = templatePlugin.getEnvironmentStub();
		environment.mainTemplate.applyPluginsWaterfall = () => [];
		plugin.apply(environment);
		return templatePlugin;
	};

	let templatePlugin;

	beforeEach(() => {
		templatePlugin = setupBasicTemplatePlugin("foo");
	});

	describe("when applied", () => {
		describe("event handlers", () => {
			let eventBindings;

			beforeEach(() => {
				eventBindings = templatePlugin.getEventBindings();
			});

			describe("handling render-with-entry", () => {
				let eventHandler;

				beforeEach(() => {
					eventHandler = eventBindings
						.filter(eventBinding => eventBinding.name === 'render-with-entry')
						.map(eventBinding => eventBinding.handler)
						.pop();
				});

				it("creates source that safely detects the global object", () => {
					const source = eventHandler("{ foo: true }", {
						getModules: () => []
					}, "bar");

					source.should.be.instanceof(ConcatSource);
					source.source().should.be.exactly(`(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else {
		var a = factory();
		for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
	}
})(typeof self !== 'undefined' ? self : this, function() {
return { foo: true };
})`);
				});
			});
		});
	});
});
