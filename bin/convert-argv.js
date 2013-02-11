var path = require("path");
var resolve = require("enhanced-resolve");

module.exports = function(optimist, argv, convertOptions) {

	var options = {};

	function ifArg(name, fn, init) {
		if(Array.isArray(argv[name])) {
			if(init) init();
			argv[name].forEach(fn);
		} else if(typeof argv[name] != "undefined") {
			if(init) init();
			fn(argv[name], -1);
		}
	}

	function ifArgPair(name, fn, init) {
		ifArg(name, function(content, idx) {
			var i = content.indexOf("=");
			if(i < 0) return fn(null, content, idx);
			else return fn(content.substr(0, i), content.substr(i+1), idx);
		}, init);
	}

	function ifBooleanArg(name, fn) {
		ifArg(name, function(bool) {
			if(bool) fn();
		});
	}

	function mapArgToBoolean(name, optionName) {
		ifBooleanArg(name, function() {
			options[optionName] = true;
		});
	}

	function mapArgToPath(name, optionName) {
		ifArg(name, function(str) {
			options[optionName] = path.resolve(str);
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
		try {
			options = require(path.resolve("webpack.config.js"));
		} catch(e) {
			options = {};
		}
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

	ifArg("output-public-path", function(value) {
		ensureObject(options, "output");
		options.output.publicPath = value;
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

	mapArgToBoolean("console", "console");
	mapArgToBoolean("cache", "cache");
	mapArgToBoolean("watch", "watch");

	ifArg("watch-delay", function(value) {
		options.watchDelay = value;
	});

	mapArgToBoolean("debug", "debug");

	ifBooleanArg("progress", function() {
		var ProgressPlugin = require("../lib/ProgressPlugin");
		ensureArray(options, "plugins");
		var chars = 0;
		options.plugins.push(new ProgressPlugin(function(percentage, msg) {
			if(percentage < 1) {
				percentage = Math.floor(percentage * 100);
				msg = percentage + "% " + msg;
				if(percentage < 100) msg = " " + msg;
				if(percentage < 10) msg = " " + msg;
			}
			for(var i = 0; i < chars; i++)
				process.stderr.write("\b");
			process.stderr.write(msg);
			chars = msg.length;
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
		ensureObject(options, "optimize");
		options.optimize.maxChunks = parseInt(value, 10);
	});

	ifArg("optimize-min-chunk-size", function(value) {
		ensureObject(options, "optimize");
		options.optimize.minChunkSize = parseInt(value, 10);
	});

	ifBooleanArg("optimize-minimize", function() {
		ensureObject(options, "optimize");
		options.optimize.minimize = true;
	});

	ifArg("plugin", function(value) {
		ensureArray(options, "plugins");
		options.plugins.push(loadPlugin(value));
	});

	mapArgToBoolean("bail", "bail");

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
			if(i < 0) addTo("main", content);
			else addTo(content.substr(0, i), content.substr(i+1))
		});
	}

	return options;
};