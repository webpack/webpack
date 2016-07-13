var path = require("path");
var fs = require("fs");
fs.existsSync = fs.existsSync || path.existsSync;
var resolve = require("enhanced-resolve");
var interpret = require("interpret");
var WebpackOptionsDefaulter = require("../lib/WebpackOptionsDefaulter");

module.exports = function(optimist, argv, convertOptions) {

	var options = {};

	// Help
	if(argv.help) {
		optimist.showHelp();
		process.exit(-1); // eslint-disable-line
	}

	// Shortcuts
	if(argv.d) {
		argv.debug = true;
		argv["output-pathinfo"] = true;
		if(!argv.devtool) {
			argv.devtool = "eval-cheap-module-source-map";
		}
	}
	if(argv.p) {
		argv["optimize-minimize"] = true;
		argv["define"] = [].concat(argv["define"] || []).concat("process.env.NODE_ENV=\"production\"");
	}

	var configFileLoaded = false;
	var configPath, ext;
	var extensions = Object.keys(interpret.extensions).sort(function(a, b) {
		return a === '.js' ? -1 : b === '.js' ? 1 : a.length - b.length;
	});
	var configFiles = ["webpack.config", "webpackfile"].map(function(filename) {
		return extensions.map(function(ext) {
			return {
				path: path.resolve(filename + ext),
				ext: ext
			};
		});
	}).reduce(function(a, i) {
		return a.concat(i);
	}, []);

	var i;
	if(argv.config) {
		configPath = path.resolve(argv.config);
		for(i = extensions.length - 1; i >= 0; i--) {
			var tmpExt = extensions[i];
			if(configPath.indexOf(tmpExt, configPath.length - tmpExt.length) > -1) {
				ext = tmpExt;
				break;
			}
		}
		if(!ext) {
			ext = path.extname(configPath);
		}
	} else {
		for(i = 0; i < configFiles.length; i++) {
			var webpackConfig = configFiles[i].path;
			if(fs.existsSync(webpackConfig)) {
				ext = configFiles[i].ext;
				configPath = webpackConfig;
				break;
			}
		}
	}

	if(configPath) {

		function registerCompiler(moduleDescriptor) {
			if(moduleDescriptor) {
				if(typeof moduleDescriptor === "string") {
					require(moduleDescriptor);
				} else if(!Array.isArray(moduleDescriptor)) {
					moduleDescriptor.register(require(moduleDescriptor.module));
				} else {
					for(var i = 0; i < moduleDescriptor.length; i++) {
						try {
							registerCompiler(moduleDescriptor[i]);
							break;
						} catch(e) {
							// do nothing
						}
					}
				}
			}
		}

		registerCompiler(interpret.extensions[ext]);
		options = require(configPath);
		configFileLoaded = true;
	}

	var isES6DefaultExportedFunc = (
		typeof options === "object" && options !== null && typeof options.default === "function"
	);

	if(typeof options === "function" || isES6DefaultExportedFunc) {
		options = isES6DefaultExportedFunc ? options.default : options;
		options = options(argv.env, argv);
	}

	return processConfiguredOptions(options);

	function processConfiguredOptions(options) {
		if(options === null || typeof options !== "object") {
			console.error("Config did not export an object or a function returning an object.");
			process.exit(-1); // eslint-disable-line
		}

		// process Promise
		if(typeof options.then === "function") {
			return options.then(processConfiguredOptions);
		}

		// process ES6 default
		if(typeof options === "object" && typeof options.default === "object") {
			return processConfiguredOptions(options.default);
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

		if(argv.watch) {
			options.watch = true;
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

		if(argv["watch-stdin"]) {
			options.watchOptions = options.watchOptions || {};
			options.watchOptions.stdin = true;
			options.watch = true;
		}

		return options;
	}

	function processOptions(options) {
		var noOutputFilenameDefined = !options.output || !options.output.filename;
		new WebpackOptionsDefaulter().process(options);

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
			var loadUtils = require("loader-utils");
			var args = null;
			try {
				var p = name && name.indexOf("?");
				if(p > -1) {
					args = loadUtils.parseQuery(name.substring(p));
					name = name.substring(0, p);
				}
			} catch(e) {
				console.log("Invalid plugin arguments " + name + " (" + e + ").");
				process.exit(-1); // eslint-disable-line
			}

			var path;
			try {
				path = resolve.sync(process.cwd(), name);
			} catch(e) {
				console.log("Cannot resolve plugin " + name + ".");
				process.exit(-1); // eslint-disable-line
			}
			var Plugin;
			try {
				Plugin = require(path);
			} catch(e) {
				console.log("Cannot load plugin " + name + ". (" + path + ")");
				throw e;
			}
			try {
				return new Plugin(args);
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

		ifArg("output-filename", function(value) {
			ensureObject(options, "output");
			options.output.filename = value;
			noOutputFilenameDefined = false;
		});

		ifArg("output-chunk-filename", function(value) {
			ensureObject(options, "output");
			options.output.chunkFilename = value;
		});

		ifArg("output-source-map-filename", function(value) {
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

		ifBooleanArg("debug", function() {
			ensureArray(options, "plugins");
			var LoaderOptionsPlugin = require("../lib/LoaderOptionsPlugin");
			options.plugins.push(new LoaderOptionsPlugin({
				debug: true
			}));
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

		ifArg("resolve-extensions", function(value) {
			ensureObject(options, "resolve");
			if(Array.isArray(value)) {
				options.resolve.extensions = value;
			} else {
				options.resolve.extensions = value.split(/,\s*/);
			}
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
			var MinChunkSizePlugin = require("../lib/optimize/MinChunkSizePlugin");
			options.plugins.push(new MinChunkSizePlugin({
				minChunkSize: parseInt(value, 10)
			}));
		});

		ifBooleanArg("optimize-minimize", function() {
			ensureArray(options, "plugins");
			var UglifyJsPlugin = require("../lib/optimize/UglifyJsPlugin");
			var LoaderOptionsPlugin = require("../lib/LoaderOptionsPlugin");
			options.plugins.push(new UglifyJsPlugin({
				sourceMap: options.devtool && (options.devtool.indexOf("sourcemap") >= 0 || options.devtool.indexOf("source-map") >= 0)
			}));
			options.plugins.push(new LoaderOptionsPlugin({
				minimize: true
			}));
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

		if(noOutputFilenameDefined) {
			ensureObject(options, "output");
			if(convertOptions && convertOptions.outputFilename) {
				options.output.path = path.dirname(convertOptions.outputFilename);
				options.output.filename = path.basename(convertOptions.outputFilename);
			} else if(argv._.length > 0) {
				options.output.filename = argv._.pop();
				options.output.path = path.dirname(options.output.filename);
				options.output.filename = path.basename(options.output.filename);
			} else if(configFileLoaded) {
				throw new Error("'output.filename' is required, either in config file or as --output-filename");
			} else {
				console.error("No configuration file found and no output filename configured via CLI option.");
				console.error("A configuration file could be named 'webpack.config.js' in the current directory.");
				console.error("Use --help to display the CLI options.");
				process.exit(-1); // eslint-disable-line
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

		if(!options.entry) {
			if(configPath) {
				console.error("Configuration file found but no entry configured.");
			} else {
				console.error("No configuration file found and no entry configured via CLI option.");
				console.error("When using the CLI you need to provide at least two arguments: entry and output.");
				console.error("A configuration file could be named 'webpack.config.js' in the current directory.");
			}
			console.error("Use --help to display the CLI options.");
			process.exit(-1); // eslint-disable-line
		}
	}
};
