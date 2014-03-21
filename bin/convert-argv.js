var path = require("path");
var fs = require("fs");
fs.existsSync = fs.existsSync || path.existsSync;
var resolve = require("enhanced-resolve");

module.exports = function(optimist, argv, convertOptions) {

	var options = {};

	// Help
	if(argv.help) {
		optimist.showHelp();
		process.exit(-1);
	}

	// Shortcuts
	if(argv.d) {
		argv.debug = true;
		argv["output-pathinfo"] = true;
		if(!argv.devtool) argv.devtool = "sourcemap";
	}
	if(argv.p) {
		argv["optimize-minimize"] = true;
		argv["optimize-occurence-order"] = true;
	}

	function ifArg(name, fn, init, finalize) {
		if(Array.isArray(argv[name])) {
			if(init) init();
			argv[name].forEach(fn);
			if(finalize) finalize();
		} else if(typeof argv[name] != "undefined") {
			if(init) init();
			fn(argv[name], -1);
			if(finalize) finalize();
		}
	}

	function ifArgPair(name, fn, init, finalize) {
		ifArg(name, function(content, idx) {
			var i = content.indexOf("=");
			if(i < 0) return fn(null, content, idx);
			else return fn(content.substr(0, i), content.substr(i+1), idx);
		}, init, finalize);
	}

	function ifBooleanArg(name, fn) {
		ifArg(name, function(bool) {
			if(bool) fn();
		});
	}

	function mapArgToBoolean(name, optionName) {
		ifBooleanArg(name, function() {
			options[optionName || name] = true;
		});
	}

	function mapArgToBooleanInverse(name, optionName) {
		ifArg(name, function(bool) {
			if(!bool) options[optionName || name] = false;
		});
	}

	function mapArgToPath(name, optionName) {
		ifArg(name, function(str) {
			options[optionName || name] = path.resolve(str);
		});
	}

	function loadPlugin(name) {
		try {
			var path = resolve.sync(process.cwd(), name);
		} catch(e) {
			console.log("Cannot resolve plugin " + name + ".");
			process.exit(-1);
		}
		try {
			var Plugin = require(path);
		} catch(e) {
			console.log("Cannot load plugin " + name + ". (" + path + ")");
			throw e;
		}
		try {
			return new Plugin();
		} catch(e) {
			console.log("Cannot instantiate plugin " + name + ". (" + path + ")");
			throw e;
		}
	}

	function ensureObject(parent, name) {
		if(typeof parent[name] != "object" || parent[name] === null)
			parent[name] = {};
	}

	function ensureArray(parent, name) {
		if(!Array.isArray(parent[name]))
			parent[name] = [];
	}

	if(argv.config) {
		options = require(path.resolve(argv.config));
	} else {
		var configPath = path.resolve("webpack.config.js");
		if(fs.existsSync(configPath))
			options = require(configPath);
	}
	if(typeof options != "object" || options === null) {
		console.log("Config did not export a object.");
		process.exit(-1);
	}

	mapArgToPath("context", "context");
	if(!options.context) options.context = process.cwd();

	ifArgPair("entry", function(name, entry) {
		options.entry[name] = entry;
	}, function() {
		ensureObject(options, "entry");
	});

	ifArgPair("module-bind", function(name, binding) {
		if(name === null) name = binding;
		options.module.loaders.push({
			test: new RegExp("\\." + name.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + "$"),
			loader: binding
		});
	}, function() {
		ensureObject(options, "module");
		ensureArray(options.module, "loaders");
	});

	ifArgPair("module-bind-pre", function(name, binding) {
		if(name === null) name = binding;
		options.module.preLoaders.push({
			test: new RegExp("\\." + name.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + "$"),
			loader: binding
		});
	}, function() {
		ensureObject(options, "module");
		ensureArray(options.module, "preLoaders");
	});

	ifArgPair("module-bind-post", function(name, binding) {
		if(name === null) name = binding;
		options.module.postLoaders.push({
			test: new RegExp("\\." + name.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + "$"),
			loader: binding
		});
	}, function() {
		ensureObject(options, "module");
		ensureArray(options.module, "postLoaders");
	});

	var defineObject;
	ifArgPair("define", function(name, value) {
		if(name === null) {
			name = value;
			value = true;
		}
		defineObject[name] = value;
	}, function() {
		defineObject = {}
	}, function() {
		ensureArray(options, "plugins");
		var DefinePlugin = require("../lib/DefinePlugin");
		options.plugins.push(new DefinePlugin(defineObject));
	});

	ifArg("output-path", function(value) {
		ensureObject(options, "output");
		options.output.path = value;
	});

	ifArg("output-file", function(value) {
		ensureObject(options, "output");
		options.output.filename = value;
	});

	ifArg("output-chunk-file", function(value) {
		ensureObject(options, "output");
		options.output.chunkFilename = value;
	});

	ifArg("output-named-chunk-file", function(value) {
		ensureObject(options, "output");
		options.output.namedChunkFilename = value;
	});

	ifArg("output-source-map-file", function(value) {
		ensureObject(options, "output");
		options.output.sourceMapFilename = value;
	});

	ifArg("output-public-path", function(value) {
		ensureObject(options, "output");
		options.output.publicPath = value;
	});

	ifArg("output-jsonp-function", function(value) {
		ensureObject(options, "output");
		options.output.jsonpFunction = value;
	});

	ifBooleanArg("output-pathinfo", function() {
		ensureObject(options, "output");
		options.output.pathinfo = true;
	});

	ifArg("output-library", function(value) {
		ensureObject(options, "output");
		options.output.library = value;
	});

	ifArg("output-library-target", function(value) {
		ensureObject(options, "output");
		options.output.libraryTarget = value;
	});

	ifArg("records-input-path", function(value) {
		options.recordsInputPath = path.resolve(value);
	});

	ifArg("records-output-path", function(value) {
		options.recordsOutputPath = path.resolve(value);
	});

	ifArg("records-path", function(value) {
		options.recordsPath = path.resolve(value);
	});

	ifArg("target", function(value) {
		options.target = value;
	});

	mapArgToBooleanInverse("cache");
	mapArgToBoolean("watch");

	ifArg("watch-delay", function(value) {
		options.watchDelay = value;
	});

	ifBooleanArg("hot", function() {
		ensureArray(options, "plugins");
		var HotModuleReplacementPlugin = require("../lib/HotModuleReplacementPlugin");
		options.plugins.push(new HotModuleReplacementPlugin());
	});

	mapArgToBoolean("debug");

	ifBooleanArg("progress", function() {
		var ProgressPlugin = require("../lib/ProgressPlugin");
		ensureArray(options, "plugins");
		var chars = 0, lastState;
		options.plugins.push(new ProgressPlugin(function(percentage, msg) {
			var state = msg;
			if(percentage < 1) {
				percentage = Math.floor(percentage * 100);
				msg = percentage + "% " + msg;
				if(percentage < 100) msg = " " + msg;
				if(percentage < 10) msg = " " + msg;
			}
			for(; chars > msg.length; chars--)
				process.stderr.write("\b \b");
			chars = msg.length;
			for(var i = 0; i < chars; i++)
				process.stderr.write("\b");
			if(options.profile) {
				state = state.replace(/^\d+\/\d+\s+/, "");
				if(percentage === 0) {
					lastState = null;
					lastStateTime = +new Date();
				} else if(state !== lastState || percentage === 1) {
					var now = +new Date();
					if(lastState) {
						process.stderr.write((now - lastStateTime) + "ms " + lastState + "\n");
					}
					lastState = state;
					lastStateTime = now;
				}
			}
			process.stderr.write(msg);
		}));
	});

	ifArg("devtool", function(value) {
		options.devtool = value;
	});

	ifArgPair("resolve-alias", function(name, value) {
		if(!name) throw new Error("--resolve-alias <string>=<string>");
		ensureObject(options, "resolve");
		ensureObject(options.resolve, "alias");
		options.resolve.alias[name] = value;
	});

	ifArgPair("resolve-loader-alias", function(name, value) {
		if(!name) throw new Error("--resolve-loader-alias <string>=<string>");
		ensureObject(options, "resolveLoader");
		ensureObject(options.resolveLoader, "alias");
		options.resolveLoader.alias[name] = value;
	});

	ifArg("optimize-max-chunks", function(value) {
		ensureArray(options, "plugins");
		var LimitChunkCountPlugin = require("../lib/optimize/LimitChunkCountPlugin");
		options.plugins.push(new LimitChunkCountPlugin({
			maxChunks: parseInt(value, 10)
		}));
	});

	ifArg("optimize-min-chunk-size", function(value) {
		ensureArray(options, "plugins");
		var LimitChunkSizePlugin = require("../lib/optimize/LimitChunkSizePlugin");
		options.plugins.push(new LimitChunkSizePlugin(parseInt(value, 10)));
	});

	ifBooleanArg("optimize-minimize", function() {
		ensureArray(options, "plugins");
		var UglifyJsPlugin = require("../lib/optimize/UglifyJsPlugin");
		options.plugins.push(new UglifyJsPlugin());
	});

	ifBooleanArg("optimize-occurence-order", function() {
		ensureArray(options, "plugins");
		var OccurenceOrderPlugin = require("../lib/optimize/OccurenceOrderPlugin");
		options.plugins.push(new OccurenceOrderPlugin());
	});

	ifBooleanArg("optimize-dedupe", function() {
		ensureArray(options, "plugins");
		var DedupePlugin = require("../lib/optimize/DedupePlugin");
		options.plugins.push(new DedupePlugin());
	});

	ifArg("prefetch", function(request) {
		ensureArray(options, "plugins");
		var PrefetchPlugin = require("../lib/PrefetchPlugin");
		options.plugins.push(new PrefetchPlugin(request));
	});

	ifArg("provide", function(value) {
		ensureArray(options, "plugins");
		var idx = value.indexOf("=");
		if(idx >= 0) {
			var name = value.substr(0, idx);
			value = value.substr(idx + 1);
		} else {
			var name = value;
		}
		var ProvidePlugin = require("../lib/ProvidePlugin");
		options.plugins.push(new ProvidePlugin(name, value));
	});

	ifBooleanArg("labeled-modules", function() {
		ensureArray(options, "plugins");
		var LabeledModulesPlugin = require("../lib/dependencies/LabeledModulesPlugin");
		options.plugins.push(new LabeledModulesPlugin());
	});

	ifArg("plugin", function(value) {
		ensureArray(options, "plugins");
		options.plugins.push(loadPlugin(value));
	});

	mapArgToBoolean("bail");

	mapArgToBoolean("profile");

	if(!options.output || !options.output.filename) {
		ensureObject(options, "output");
		if(convertOptions && convertOptions.outputFilename) {
			options.output.path = path.dirname(convertOptions.outputFilename);
			options.output.filename = path.basename(convertOptions.outputFilename);
		} else if(argv._.length > 0) {
			options.output.filename = argv._.pop();
			options.output.path = path.dirname(options.output.filename);
			options.output.filename = path.basename(options.output.filename);
		} else {
			optimist.showHelp();
			process.exit(-1);
		}
	}

	if(argv._.length > 0) {
		ensureObject(options, "entry");
		function addTo(name, entry) {
			if(options.entry[name]) {
				if(!Array.isArray(options.entry[name]))
					options.entry[name] = [options.entry[name]];
				options.entry[name].push(entry);
			} else {
				options.entry[name] = entry;
			}
		}
		argv._.forEach(function(content) {
			var i = content.indexOf("=");
			var j = content.indexOf("?");
			if(i < 0 || (j >= 0 && j < i)) {
				var resolved = path.resolve(content);
				if(fs.existsSync(resolved)) addTo("main", resolved);
				else addTo("main", content);
			} else addTo(content.substr(0, i), content.substr(i+1))
		});
	}

	return options;
};