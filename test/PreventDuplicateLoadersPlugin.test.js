"use strict";

require("should");

const sinon = require("sinon");
const applyPluginWithOptions = require("./helpers/applyPluginWithOptions");
const PluginEnvironment = require("./helpers/PluginEnvironment");

const PreventDuplicateLoadersPlugin = require("../lib/PreventDuplicateLoadersPlugin");

describe("PreventDuplicateLoadersPlugin", () => {
	var env;

	beforeEach(() => {
		env = {};
	});

	it("has apply function", () => {
		(new PreventDuplicateLoadersPlugin()).apply.should.be.a.Function();
	});

	describe("when applied", () => {
		beforeEach(() => {
			env.eventBindings = applyPluginWithOptions(PreventDuplicateLoadersPlugin);
		});

		it("binds one event handler", () => {
			env.eventBindings.length.should.be.exactly(1);
		});

		describe("compilation handler", () => {
			beforeEach(() => {
				env.pluginEnvironment = new PluginEnvironment();
				env.eventBinding = env.eventBindings[0];
				env.eventBinding.handler(env.pluginEnvironment.getEnvironmentStub());
				env.compilationEventBindings = env.pluginEnvironment.getEventBindings();
			});

			it("binds to compilation event", () => {
				env.eventBinding.name.should.be.exactly("compilation");
			});

			// This test prevent having a Plugin with more tha one
			// `compiler.plugin` call.
			it("binds one compilation event handler", () => {
				env.compilationEventBindings.length.should.be.exactly(1);
			});

			describe("normal-module-loader", () => {
				const loaderContextMock = {
					emitError: sinon.spy(),
					emitWarning: sinon.spy(),
				};
				const moduleWithoutErrors = {
					loaders: [{
						// This is how I see it on w10
						loader: "C:\\\\Folder1\\\\Folder2\\\\Folder3\\\\windows-loader\\\\index.js",
					}, {
						// This is how would be seen on linux
						loader: "/Folder1/Folder2/Folder3/linux-loader/index.js",
					}],
				};
				const moduleWithErrorsOnWindows = {
					loaders: [{
						loader: "C:\\\\Folder1\\\\Folder2\\\\Folder3\\\\windows-loader\\\\index.js",
					}, {
						loader: "C:\\\\Folder1\\\\Folder2\\\\Folder3\\\\windows-loader\\\\index.js",
					}],
				};
				const moduleWithErrorsOnLinux = {
					loaders: [{
						loader: "/Folder1/Folder2/Folder3/linux-loader/index.js",
					}, {
						loader: "/Folder1/Folder2/Folder3/linux-loader/index.js",
					}],
				};
				const moduleWithDifferentOptions = {
					loaders: [{
						loader: "/Folder1/linuxloader.js",
						options: { foo: "someValue" },
					}, {
						loader: "/Folder1/linuxloader.js",
						options: "bar=someValue",
					}],
				};
				const moduleWithSameOptions = {
					loaders: [{
						loader: "/Folder1/linuxloader.js",
						options: { foo: "someValue" },
					}, {
						loader: "/Folder1/linuxloader.js",
						options: "foo=someValue",
					}],
				};

				beforeEach(() => {
					loaderContextMock.emitError.reset();
					env.compilationEventBinding = env.compilationEventBindings[0];
				});

				it("binds to `normal-module-loader` event", () => {
					env.compilationEventBinding.handler(loaderContextMock, moduleWithoutErrors);
					env.compilationEventBinding.name.should.be.exactly("normal-module-loader");
				});

				it("doesn't adds an error when loaders are unique", () => {
					env.compilationEventBinding.handler(loaderContextMock, moduleWithoutErrors);
					loaderContextMock.emitError.callCount.should.be.exactly(0);
				});

				it("adds an error when are repeated loaders (on Windows)", () => {
					env.compilationEventBinding.handler(loaderContextMock, moduleWithErrorsOnWindows);
					loaderContextMock.emitError.callCount.should.be.exactly(1);
				});

				it("adds an error when are repeated loaders (on Linux)", () => {
					env.compilationEventBinding.handler(loaderContextMock, moduleWithErrorsOnLinux);
					loaderContextMock.emitError.callCount.should.be.exactly(1);
				});

				it("adds a warning when they have different options?", () => {
					env.compilationEventBinding.handler(loaderContextMock, moduleWithDifferentOptions);
					loaderContextMock.emitWarning.callCount.should.be.exactly(1);
				});

				it("adds an error when they have the same options", () => {
					env.compilationEventBinding.handler(loaderContextMock, moduleWithSameOptions);
					loaderContextMock.emitError.callCount.should.be.exactly(1);
				});
			});
		});
	});
});
