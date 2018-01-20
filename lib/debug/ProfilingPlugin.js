const fs = require("fs");
const Trace = require("chrome-trace-event").Tracer;
let inspector = undefined;

try {
	inspector = require("inspector"); // eslint-disable-line node/no-missing-require
} catch(e) {
	console.log("Unable to CPU profile in < node 8.0");
}

// TODO: Add this to webpack.js.org docs for this plugin, and for profiling build times
/**
 * How this plugin works: (placeholder until in docs)
 *
 * In chrome, open the `Profile Tab`, when you run webpack,
 * this plugin will output an events.json file that you
 * can drag and drop into the profiler. It will then display timeline stats and calls per plugin!
 *
 * Example: https://chromedevtools.github.io/timeline-viewer/?url=https%3A%2F%2Fgist.githubusercontent.com%2FTheLarkInn%2Fb94b728fa5e22f62c312e110a9944768%2Fraw%2Fcb672fb3f661a17576803e41db6030382b1a0fc9%2Fevents.json&loadTimelineFromURL=drive://163GY-H0wvF9rSrlwjJcrdTL-YLnppp55
 */

class Profiler {
	constructor(inspector) {
		this.session = undefined;
		this.inspector = inspector;
	}

	hasSession() {
		return this.session !== undefined;
	}

	startProfiling() {
		if(this.inspector === undefined) {
			return Promise.resolve();
		}

		try {
			this.session = new inspector.Session();
			this.session.connect();
		} catch(_) {
			this.session = undefined;
			return Promise.resolve();
		}

		return Promise.all([
			this.sendCommand("Profiler.setSamplingInterval", {
				interval: 100
			}),
			this.sendCommand("Profiler.enable"),
			this.sendCommand("Profiler.start"),
		]);
	}

	sendCommand(method, params) {
		if(this.hasSession()) {
			return new Promise((res, rej) => {
				return this.session.post(method, params, (err, params) => {
					if(err !== null) {
						rej(err);
					} else {
						res(params);
					}
				});
			});
		} else {
			return Promise.resolve();
		}
	}

	destroy() {
		if(this.hasSession()) {
			this.session.disconnect();
		}

		return Promise.resolve();
	}

	stopProfiling() {
		return this.sendCommand("Profiler.stop");
	}
}

/**
 * @param {string} outPath The location where to write the log.
 * @returns {{trace: ?,	counter: number, profiler: Profiler}} The trace object
 */
function createTrace(outPath) {
	const trace = new Trace({
		noStream: true
	});
	const profiler = new Profiler(inspector);

	let counter = 0;

	trace.pipe(fs.createWriteStream(outPath));
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
				frames: [{
					frame: "0xfff",
					url: "webpack",
					name: ""
				}]
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
		trace,
		counter,
		profiler
	};
}

class ProfilingPlugin {
	// TODO: Add plugin schema validation here since there are options.
	constructor(opts) {
		opts = opts || {};
		this.outPath = opts.outPath || "events.json";
	}

	apply(compiler) {
		const tracer = createTrace(this.outPath);
		tracer.profiler.startProfiling();

		// Compiler Hooks
		Object.keys(compiler.hooks).forEach(hookName => {
			compiler.hooks[hookName].intercept(makeInterceptorFor("Compiler", tracer)(hookName));
		});

		Object.keys(compiler.resolverFactory.hooks).forEach(hookName => {
			compiler.resolverFactory.hooks[hookName].intercept(makeInterceptorFor("Resolver", tracer)(hookName));
		});

		compiler.hooks.compilation.tap("ProfilingPlugin", (compilation, {
			normalModuleFactory,
			contextModuleFactory
		}) => {
			interceptAllHooksFor(compilation, tracer, "Compilation");
			interceptAllHooksFor(normalModuleFactory, tracer, "Normal Module Factory");
			interceptAllHooksFor(contextModuleFactory, tracer, "Context Module Factory");
			interceptAllParserHooks(normalModuleFactory, tracer);
			interceptTemplateInstancesFrom(compilation, tracer);
		});

		// We need to write out the CPU profile when we are all done.
		compiler.hooks.done.tap({
			name: "ProfilingPlugin",
			stage: Infinity
		}, () => {
			tracer.profiler.stopProfiling().then((parsedResults) => {

				if(parsedResults === undefined) {
					tracer.profiler.destroy();
					tracer.trace.flush();
					return;
				}

				const cpuStartTime = parsedResults.profile.startTime;
				const cpuEndTime = parsedResults.profile.endTime;

				tracer.trace.completeEvent({
					name: "TaskQueueManager::ProcessTaskFromWorkQueue",
					id: ++tracer.counter,
					cat: ["toplevel"],
					ts: cpuStartTime,
					args: {
						src_file: "../../ipc/ipc_moji_bootstrap.cc",
						src_func: "Accept"
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
							cpuProfile: parsedResults.profile
						}
					}
				});

				tracer.profiler.destroy();
				tracer.trace.flush();
			});
		});
	}
}

const interceptTemplateInstancesFrom = (compilation, tracer) => {
	const {
		mainTemplate,
		chunkTemplate,
		hotUpdateChunkTemplate,
		moduleTemplates
	} = compilation;

	const {
		javascript,
		webassembly
	} = moduleTemplates;

	[{
			instance: mainTemplate,
			name: "MainTemplate"
		},
		{
			instance: chunkTemplate,
			name: "ChunkTemplate"
		},
		{
			instance: hotUpdateChunkTemplate,
			name: "HotUpdateChunkTemplate"
		},
		{
			instance: javascript,
			name: "JavaScriptModuleTemplate"
		},
		{
			instance: webassembly,
			name: "WebAssemblyModuleTemplate"
		}
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
		"javascript/dynamic",
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
	register: ({
		name,
		type,
		fn
	}) => {
		const newFn = makeNewProfiledTapFn(hookName, tracer, {
			name,
			type,
			fn
		});
		return({ // eslint-disable-line
			name,
			type,
			fn: newFn
		});
	}
});

/**
 * @param {string} hookName Name of the hook to profile.
 * @param {{counter: number, trace: *, profiler: *}} tracer Instance of tracer.
 * @param {{name: string, type: string, fn: Function}} opts Options for the profiled fn.
 * @returns {*} Chainable hooked function.
 */
const makeNewProfiledTapFn = (hookName, tracer, {
	name,
	type,
	fn
}) => {
	const defaultCategory = ["blink.user_timing"];

	switch(type) {
		case "promise":
			return(...args) => { // eslint-disable-line
				const id = ++tracer.counter;
				tracer.trace.begin({
					name,
					id,
					cat: defaultCategory
				});
				return fn(...args).then(r => {
					tracer.trace.end({
						name,
						id,
						cat: defaultCategory
					});
					return r;
				});
			};
		case "async":
			return(...args) => { // eslint-disable-line
				const id = ++tracer.counter;
				tracer.trace.begin({
					name,
					id,
					cat: defaultCategory
				});
				fn(...args, (...r) => {
					const callback = args.pop();
					tracer.trace.end({
						name,
						id,
						cat: defaultCategory
					});
					callback(...r);
				});
			};
		case "sync":
			return(...args) => { // eslint-disable-line
				const id = ++tracer.counter;
				tracer.trace.begin({
					name,
					id,
					cat: defaultCategory
				});
				let r;
				try {
					r = fn(...args);
				} catch(error) {
					tracer.trace.end({
						name,
						id,
						cat: defaultCategory
					});
					throw error;
				}
				tracer.trace.end({
					name,
					id,
					cat: defaultCategory
				});
				return r;
			};
		default:
			break;
	}
};

module.exports = ProfilingPlugin;
module.exports.Profiler = Profiler;
