var path = require("path");
var fs = require("fs");
fs.existsSync = fs.existsSync || path.existsSync;
var resolve = require("enhanced-resolve");
var interpret = require("interpret");

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
		if(!argv.devtool) {
			argv.devtool = "sourcemap";
		}
	}
	if(argv.p) {
		argv["optimize-minimize"] = true;
		argv["optimize-occurence-order"] = true;
	}

	var configPath, ext;
	var extensions = Object.keys(interpret.extensions).sort(function(a, b){
		return a.length - b.length;
	});

	if (argv.config) {
		configPath = path.resolve(argv.config);
		for (var i = extensions.length - 1; i >= 0; i--) {
			var tmpExt = extensions[i];
			if (configPath.indexOf(tmpExt, configPath.length - tmpExt.length) > -1){
				ext = tmpExt;
				break;
			}
		};
		if (!ext) {
			ext = path.extname(configPath);
		}
	} else {
		for(var i = 0; i < extensions.length; i++) {
			var webpackConfig = path.resolve('webpack.config' + extensions[i]);
			if(fs.existsSync(webpackConfig)) {
				ext = extensions[i];
				configPath = webpackConfig;
				break;
			}
		}
	}

	if(configPath) {
		var moduleName = interpret.extensions[ext];
		if (moduleName) {
			var compiler = require(moduleName);
			var register = interpret.register[moduleName];
			var config = interpret.configurations[moduleName];
			if (register) {
				register(compiler, config);
			}
		}
		options = require(configPath);
	}

	if(typeof options !== "object" || options === null) {
		console.log("Config did not export an object.");
		process.exit(-1);
	}

	if(Array.isArray(options)) {
		options.forEach(processOptions);
	} else {
		processOptions(options);
	}

	if(argv.context) {
		options.context = path.resolve(argv.context);
	}
	if(!options.context) {
		options.context = process.cwd();
	}

	if(argv["watch"]) {
		// TODO remove this in next major version
		if(options.watch && typeof options.watch === "object") {
			console.warn("options.watch is deprecated: Use 'options.watchOptions' instead");
			options.watchOptions = options.watch;
		}
		// TODO remove this in next major version
		if(options.watchDelay) {
			console.warn("options.watchDelay is deprecated: Use 'options.watchOptions.aggregateTimeout' instead");
			options.watchOptions = options.watchOptions || {};
			options.watchOptions.aggregateTimeout = options.watchDelay;
		}
		options.watch = true;
	}

	if(argv["watch-delay"]) {
		console.warn("--watch-delay is deprecated: Use '--watch-aggregate-timeout' instead");
		options.watchOptions = options.watchOptions || {};
		options.watchOptions.aggregateTimeout = +argv["watch-delay"];
	}

	if(argv["watch-aggregate-timeout"]) {
		options.watchOptions = options.watchOptions || {};
		options.watchOptions.aggregateTimeout = +argv["watch-aggregate-timeout"];
	}

	if(argv["watch-poll"]) {
		options.watchOptions = options.watchOptions || {};
		if(typeof argv["watch-poll"] !== "boolean")
			options.watchOptions.poll = +argv["watch-poll"];
		else
			options.watchOptions.poll = true;
	}

	function processOptions(options) {
		function ifArg(name, fn, init, finalize) {
			if(Array.isArray(argv[name])) {
				if(init) {
					init();
				}
				argv[name].forEach(fn);
				if(finalize) {
					finalize();
				}
			} else if(typeof argv[name] !== "undefined") {
				if(init) {
					init();
				}
				fn(argv[name], -1);
				if(finalize) {
					finalize();
				}
			}
		}

		function ifArgPair(name, fn, init, finalize) {
			ifArg(name, function(content, idx) {
				var i = content.indexOf("=");
				if(i < 0) {
					return fn(null, content, idx);
				} else {
					return fn(content.substr(0, i), content.substr(i + 1), idx);
				}
			}, init, finalize);
		}

		function ifBooleanArg(name, fn) {
			ifArg(name, function(bool) {
				if(bool) {
					fn();
				}
			});
		}

		function mapArgToBoolean(name, optionName) {
			ifBooleanArg(name, function() {
				options[optionName || name] = true;
			});
		}

		function mapArgToBooleanInverse(name, optionName) {
			ifArg(name, function(bool) {
				if(!bool) {
					options[optionName || name] = false;
				}
			});
		}

		function mapArgToPath(name, optionName) {
			ifArg(name, function(str) {
				options[optionName || name] = path.resolve(str);
			});
		}

		function loadPlugin(name) {
			var path;
			try {
				path = resolve.sync(process.cwd(), name);
			} catch(e) {
				console.log("Cannot resolve plugin " + name + ".");
				process.exit(-1);
			}
			var Plugin;
			try {
				Plugin = require(path);
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
			if(typeof parent[name] !== "object" || parent[name] === null) {
				parent[name] = {};
			}
		}

		function ensureArray(parent, name) {
			if(!Array.isArray(parent[name])) {
				parent[name] = [];
			}
		}

		ifArgPair("entry", function(name, entry) {
			options.entry[name] = entry;
		}, function() {
			ensureObject(options, "entry");
		});

		function bindLoaders(arg, collection) {
			ifArgPair(arg, function(name, binding) {
				if(name === null) {
					name = binding;
				}
				options.module[collection].push({
					test: new RegExp("\\." + name.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&") + "$"),
					loader: binding
				});
			}, function() {
				ensureObject(options, "module");
				ensureArray(options.module, collection);
			});
		}
		bindLoaders("module-bind", "loaders");
		bindLoaders("module-bind-pre", "preLoaders");
		bindLoaders("module-bind-post", "postLoaders");

		var defineObject;
		ifArgPair("define", function(name, value) {
			if(name === null) {
				name = value;
				value = true;
			}
			defineObject[name] = value;
		}, function() {
			defineObject = {};
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

		ifBooleanArg("hot", function() {
			ensureArray(options, "plugins");
			var HotModuleReplacementPlugin = require("../lib/HotModuleReplacementPlugin");
			options.plugins.push(new HotModuleReplacementPlugin());
		});

		mapArgToBoolean("debug");

		ifBooleanArg("progress", function() {
			var ProgressPlugin = require("../lib/ProgressPlugin");
			ensureArray(options, "plugins");
			var chars = 0, lastState, lastStateTime;
			options.plugins.push(new ProgressPlugin(function(percentage, msg) {
				var state = msg;
				if(percentage < 1) {
					percentage = Math.floor(percentage * 100);
					msg = percentage + "% " + msg;
					if(percentage < 100) {
						msg = " " + msg;
					}
					if(percentage < 10) {
						msg = " " + msg;
					}
				}
				if(options.profile) {
					state = state.replace(/^\d+\/\d+\s+/, "");
					if(percentage === 0) {
						lastState = null;
						lastStateTime = +new Date();
					} else if(state !== lastState || percentage === 1) {
						var now = +new Date();
						if(lastState) {
							var stateMsg = (now - lastStateTime) + "ms " + lastState;
							goToLineStart(stateMsg);
							process.stderr.write(stateMsg + "\n");
							chars = 0;
						}
						lastState = state;
						lastStateTime = now;
					}
				}
				goToLineStart(msg);
				process.stderr.write(msg);
			}));
			function goToLineStart(nextMessage) {
				var str = "";
				for(; chars > nextMessage.length; chars--) {
					str += "\b \b";
				}
				chars = nextMessage.length;
				for(var i = 0; i < chars; i++) {
					str += "\b";
				}
				if(str) process.stderr.write(str);
			}
		});

		ifArg("devtool", function(value) {
			options.devtool = value;
		});

		function processResolveAlias(arg, key) {
			ifArgPair(arg, function(name, value) {
				if(!name) {
					throw new Error("--" + arg + " <string>=<string>");
				}
				ensureObject(options, key);
				ensureObject(options[key], "alias");
				options[key].alias[name] = value;
			});
		}
		processResolveAlias("resolve-alias", "resolve");
		processResolveAlias("resolve-loader-alias", "resolveLoader");

		ifArg("optimize-max-chunks", function(value) {
			ensureArray(options, "plugins");
			var LimitChunkCountPlugin = require("../lib/optimize/LimitChunkCountPlugin");
			options.plugins.push(new LimitChunkCountPlugin({
				maxChunks: parseInt(value, 10)
			}));
		});

		ifArg("optimize-min-chunk-size", function(value) {
			ensureArray(options, "plugins");
			var MinChunkSizePlugin = require("../lib/optimize/MinChunkSizePlugin");
			options.plugins.push(new MinChunkSizePlugin({
				minChunkSize: parseInt(value, 10)
			}));
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
			var name;
			if(idx >= 0) {
				name = value.substr(0, idx);
				value = value.substr(idx + 1);
			} else {
				name = value;
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
			if(Array.isArray(options.entry) || typeof options.entry === "string") {
				options.entry = {
					main: options.entry
				};
			}
			ensureObject(options, "entry");
			function addTo(name, entry) {
				if(options.entry[name]) {
					if(!Array.isArray(options.entry[name])) {
						options.entry[name] = [options.entry[name]];
					}
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
					if(fs.existsSync(resolved)) {
						addTo("main", resolved);
					} else {
						addTo("main", content);
					}
				} else {
					addTo(content.substr(0, i), content.substr(i + 1));
				}
			});
		}

	}

	return options;
};
