const fs = require('fs');
const chalk = require("chalk");
const Trace = require('trace-event').Tracer;
const profiler = require('v8-profiler');

function sleep(num) {
	return new Promise((res) => {
		setTimeout(res, num);
	});
}

function createTrace() {
	const trace = new Trace({ noStream: true });
	let counter = 0;

	trace.pipe(fs.createWriteStream("events.log"));
	// These are critical events that need to be inserted so that tools like 
	// chrome dev tools can load the profile.
	trace.instantEvent({
		name: "TracingStartedInPage",
		id: ++counter,
		cat: ["disabled-by-default-devtools.timeline"],
		args: {
			data: {
				sessionId: "-1",
				page: "0xfff",
				frames: [
					{
						frame: "0xfff",
						url: "webpack",
						name: ""
					}
				]
			}
		}
	});

	trace.instantEvent({
		name: "TracingStartedInBrowser",
		id: ++counter,
		cat: ["disabled-by-default-devtools.timeline"],
		args: {
			data: {
				sessionId: "-1"
			},
		}
	});

	return {
		trace, counter
	};
}

class ProfilingPlugin {

	apply(compiler) {
		const tracer = createTrace();
		profiler.startProfiling('1', true);
		// Compiler Hooks
		Object.keys(compiler.hooks).forEach(hookName => {
			compiler.hooks[hookName].intercept(makeInterceptorFor("Compiler", tracer)(hookName));
		});

		Object.keys(compiler.resolverFactory.hooks).forEach(hookName => {
			compiler.resolverFactory.hooks[hookName].intercept(makeInterceptorFor("Resolver", tracer)(hookName));
		});

		compiler.hooks.compilation.tap("ProfilingPlugin", (compilation, { normalModuleFactory, contextModuleFactory }) => {
			interceptAllHooksFor(compilation, tracer, "Compilation");
			interceptAllHooksFor(normalModuleFactory, tracer, "Normal Module Factory");
			interceptAllHooksFor(contextModuleFactory, tracer, "Context Module Factory");
			interceptAllParserHooks(normalModuleFactory, tracer);
			interceptTemplateInstancesFrom(compilation, tracer);
		});


		// We need to write out the CPU profile when we are all done.
		compiler.plugin('done', async () => {
			// TODO(sean) Is there a better way to be the last thing to run?
			await sleep(2000)

			const profile = profiler.stopProfiling();
			profile.export((err, profileResults) => {
				const parsedResults = JSON.parse(profileResults);
				const cpuStartTime = parsedResults.startTime;
				const cpuEndTime = parsedResults.endTime;

				tracer.trace.completeEvent({
					name: "TaskQueueManager::ProcessTaskFromWorkQueue",
					id: ++tracer.counter,
					cat: ["toplevel"],
					ts: cpuStartTime,
					args: {
						src_file: '../../ipc/ipc_moji_bootstrap.cc',
						src_func: 'Accept'
					}
				});

				tracer.trace.completeEvent({
					name: "EvaluateScript",
					id: ++tracer.counter,
					cat: ["devtools.timeline"],
					ts: cpuStartTime,
					dur: cpuEndTime - cpuStartTime,
					args: {
						data: {
							url: "webpack",
							lineNumber: 1,
							columnNumber: 1,
							frame: "0xFFF"
						}
					}
				});

				tracer.trace.instantEvent({
					name: "CpuProfile",
					id: ++tracer.counter,
					cat: ["disabled-by-default-devtools.timeline"],
					ts: cpuEndTime,
					args: {
						data: {
							cpuProfile: parsedResults
						}
					}
				});

				tracer.trace.flush();
			});
		});
	}
}

const interceptTemplateInstancesFrom = (compilation, tracer) => {
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
			templateObject.instance.hooks[hookName].intercept(makeInterceptorFor(templateObject.name, tracer)(hookName));
		});
	});
};

const interceptAllHooksFor = (instance, tracer, logLabel) => {
	Object.keys(instance.hooks).forEach(hookName => {
		instance.hooks[hookName].intercept(makeInterceptorFor(logLabel, tracer)(hookName));
	});
};

const interceptAllParserHooks = (moduleFactory, tracer) => {
	const moduleTypes = [
		"javascript/auto",
		"javascript/esm",
		"json",
		"webassembly/experimental"
	];

	moduleTypes.forEach(moduleType => {
		moduleFactory.hooks.parser.for(moduleType).tap("ProfilingPlugin", (parser, parserOpts) => {
			interceptAllHooksFor(parser, tracer, "Parser");
		});
	});
};

const makeInterceptorFor = (instance, tracer) => (hookName) => ({
	register: ({ name, type, fn }) => {
		const newFn = makeNewProfiledTapFn(hookName, tracer, { name, type, fn });
		return ({ name, type, fn: newFn });
	}
});

/**
 * @param {string} hookName 
 * @param {{counter: number, trace: *}} tracer 
 * @param {{name: string, type: string, fn: Function}} opts
 */
const makeNewProfiledTapFn = (hookName, tracer, { name, type, fn }) => {
	const defaultCategory = ["blink.user_timing"];

	switch (type) {
		case "promise":
			return (...args) => {
				const id = ++tracer.counter;
				tracer.trace.begin({ name, id, cat: defaultCategory });
				return fn(...args).then(r => {
					tracer.trace.end({ name, id, cat: defaultCategory });
					return r;
				});
			};
		case "async":
			return (...args) => {
				const id = ++tracer.counter;
				tracer.trace.begin({ name, id, cat: defaultCategory });
				fn(...args, (...r) => {
					tracer.trace.end({ name, id, cat: defaultCategory });
					callback(...r);
				});
			};
		case "sync":
			return (...args) => {
				const id = ++tracer.counter;
				tracer.trace.begin({ name, id, cat: defaultCategory });
				let r;
				try {
					r = fn(...args);
				} catch (error) {
					tracer.trace.end({ name, id, cat: defaultCategory });
					throw error;
				}
				tracer.trace.end({ name, id, cat: defaultCategory });
				return r;
			};
		default:
			break;
	}
};

module.exports = ProfilingPlugin;
