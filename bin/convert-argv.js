var path = require("path");
var fs = require("fs");
fs.existsSync = fs.existsSync || path.existsSync;
var interpret = require("interpret");
var prepareOptions = require("../lib/prepareOptions");

var processOptions = require("../lib/processOptions");

module.exports = function(yargs, argv, convertOptions) {

	var options = [];

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
	var configFiles = [];
	var extensions = Object.keys(interpret.extensions).sort(function(a, b) {
		return a === ".js" ? -1 : b === ".js" ? 1 : a.length - b.length;
	});
	var defaultConfigFiles = ["webpack.config", "webpackfile"].map(function(filename) {
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
		var getConfigExtension = function getConfigExtension(configPath) {
			for(i = extensions.length - 1; i >= 0; i--) {
				var tmpExt = extensions[i];
				if(configPath.indexOf(tmpExt, configPath.length - tmpExt.length) > -1) {
					return tmpExt;
				}
			}
			return path.extname(configPath);
		};

		var mapConfigArg = function mapConfigArg(configArg) {
			var resolvedPath = path.resolve(configArg);
			var extension = getConfigExtension(resolvedPath);
			return {
				path: resolvedPath,
				ext: extension
			};
		};

		var configArgList = Array.isArray(argv.config) ? argv.config : [argv.config];
		configFiles = configArgList.map(mapConfigArg);
	} else {
		for(i = 0; i < defaultConfigFiles.length; i++) {
			var webpackConfig = defaultConfigFiles[i].path;
			if(fs.existsSync(webpackConfig)) {
				configFiles.push({
					path: webpackConfig,
					ext: defaultConfigFiles[i].ext
				});
				break;
			}
		}
	}

	if(configFiles.length > 0) {
		var registerCompiler = function registerCompiler(moduleDescriptor) {
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
		};

		var requireConfig = function requireConfig(configPath) {
			var options = require(configPath);
			options = prepareOptions(options, argv);
			return options;
		};

		configFiles.forEach(function(file) {
			registerCompiler(interpret.extensions[file.ext]);
			options.push(requireConfig(file.path));
		});
		configFileLoaded = true;
	}

	if(!configFileLoaded) {
		return processConfiguredOptions({});
	} else if(options.length === 1) {
		return processConfiguredOptions(options[0]);
	} else {
		return processConfiguredOptions(options);
	}

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

		// filter multi-config by name
		if(Array.isArray(options) && argv["config-name"]) {
			var namedOptions = options.filter(function(opt) {
				return opt.name === argv["config-name"];
			});
			if(namedOptions.length === 0) {
				console.error("Configuration with name '" + argv["config-name"] + "' was not found.");
				process.exit(-1); // eslint-disable-line
			} else if(namedOptions.length === 1) {
				return processConfiguredOptions(namedOptions[0]);
			}
			options = namedOptions;
		}

		if(Array.isArray(options)) {
			options.forEach((option) => processOptions(option, argv, convertOptions, configFileLoaded));
		} else {
			processOptions(options, argv, convertOptions, configFileLoaded);
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

		if(typeof argv["watch-poll"] !== "undefined") {
			options.watchOptions = options.watchOptions || {};
			if(argv["watch-poll"] === "true" || argv["watch-poll"] === "")
				options.watchOptions.poll = true;
			else if(!isNaN(argv["watch-poll"]))
				options.watchOptions.poll = +argv["watch-poll"];
		}

		if(argv["watch-stdin"]) {
			options.watchOptions = options.watchOptions || {};
			options.watchOptions.stdin = true;
			options.watch = true;
		}

		return options;
	}
};
