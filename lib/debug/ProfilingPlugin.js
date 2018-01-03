const fs = require('fs');
const chalk = require("chalk");
const Trace = require('trace-event').Tracer;
let trace = new Trace();

trace.pipe(fs.createWriteStream("events.log"));

class ProfilingPlugin {
	apply(compiler) {
		// Compiler Hooks
		Object.keys(compiler.hooks).forEach(hookName => {
			compiler.hooks[hookName].intercept(makeInterceptorFor("Compiler")(hookName));
		});

		Object.keys(compiler.resolverFactory.hooks).forEach(hookName => {
			compiler.resolverFactory.hooks[hookName].intercept(makeInterceptorFor("Resolver")(hookName));
		});

		compiler.hooks.compilation.tap("ProfilingPlugin", (compilation, { normalModuleFactory, contextModuleFactory }) => {
			interceptAllHooksFor(compilation, "Compilation");
			interceptAllHooksFor(normalModuleFactory, "Normal Module Factory");
			interceptAllHooksFor(contextModuleFactory, "Context Module Factory");
			interceptAllParserHooks(normalModuleFactory);
			interceptTemplateInstancesFrom(compilation);
		});
	}
}

const interceptTemplateInstancesFrom = (compilation) => {
	const { mainTemplate, chunkTemplate, hotUpdateChunkTemplate, moduleTemplates } = compilation;

	const {
    javascript,
		webassembly
  } = moduleTemplates;

	[
		{ instance: mainTemplate, name: "MainTemplate" },
		{ instance: chunkTemplate, name: "ChunkTemplate" },
		{ instance: hotUpdateChunkTemplate, name: "HotUpdateChunkTemplate" },
		{ instance: javascript, name: "JavaScriptModuleTemplate" },
		{ instance: webassembly, name: "WebAssemblyModuleTemplate" }
	].forEach(templateObject => {
		Object.keys(templateObject.instance.hooks).forEach(hookName => {
			templateObject.instance.hooks[hookName].intercept(makeInterceptorFor(templateObject.name)(hookName));
		});
	});
};

const interceptAllHooksFor = (instance, logLabel) => {
	Object.keys(instance.hooks).forEach(hookName => {
		instance.hooks[hookName].intercept(makeInterceptorFor(logLabel)(hookName));
	});
};

const interceptAllParserHooks = (moduleFactory) => {
	const moduleTypes = [
		"javascript/auto",
		"javascript/esm",
		"json",
		"webassembly/experimental"
	];

	moduleTypes.forEach(moduleType => {
		moduleFactory.hooks.parser.for(moduleType).tap("ProfilingPlugin", (parser, parserOpts) => {
			interceptAllHooksFor(parser, "Parser");
		});
	});
};

const makeInterceptorFor = (instance) => (hookName) => ({
	register: ({ name, type, fn }) => {
		const newFn = makeNewProfiledTapFn(hookName, { name, type, fn });
		return ({ name, type, fn: newFn });
	}
});

const makeNewProfiledTapFn = (hookName, { name, type, fn }) => {
	const timingId = `${hookName}-${name}`;

	switch(type) {
		case "promise":
			return (...args) => {
				trace.begin({name, id: timingId});
				return fn(...args).then(r => {
					trace.begin({name, id: timingId});
					return r;
				});
			};
		case "async":
			return (...args) => {
				trace.begin({name, id: timingId});
				fn(...args, (...r) => {
					trace.end({name, id: timingId});
					callback(...r);
				});
			};
		case "sync":
			return (...args) => {
				trace.begin({name, id: timingId});
				let r;
				try {
					r = fn(...args);
				} catch(error) {
					trace.end({name, id: timingId});
					throw error;
				}
				trace.end({name, id: timingId});
				return r;
			};
		default:
			break;
	}
};

module.exports = ProfilingPlugin;
