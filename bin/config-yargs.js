var CONFIG_GROUP = "Config options:";
var BASIC_GROUP = "Basic options:";
var MODULE_GROUP = "Module options:";
var OUTPUT_GROUP = "Output options:";
var ADVANCED_GROUP = "Advanced options:";
var RESOLVE_GROUP = "Resolving options:";
var OPTIMIZE_GROUP = "Optimizing options:";

module.exports = function(yargs) {
	yargs
		.help("help")
		.alias("help", "h", "?")
		.options({
			"config": {
				type: "string",
				describe: "Path to the config file",
				group: CONFIG_GROUP,
				defaultDescription: "webpack.config.js or webpackfile.js",
				requiresArg: true
			},
			"env": {
				describe: "Enviroment passed to the config, when it is a function",
				group: CONFIG_GROUP
			},
			"context": {
				type: "string",
				describe: "The root directory for resolving entry point and stats",
				group: BASIC_GROUP,
				defaultDescription: "The current directory",
				requiresArg: true
			},
			"entry": {
				type: "string",
				describe: "The entry point",
				group: BASIC_GROUP,
				requiresArg: true
			},
			"module-bind": {
				type: "string",
				describe: "Bind an extension to a loader",
				group: MODULE_GROUP,
				requiresArg: true
			},
			"module-bind-post": {
				type: "string",
				describe: "",
				group: MODULE_GROUP,
				requiresArg: true
			},
			"module-bind-pre": {
				type: "string",
				describe: "",
				group: MODULE_GROUP,
				requiresArg: true
			},
			"output-path": {
				type: "string",
				describe: "The output path for compilation assets",
				group: OUTPUT_GROUP,
				defaultDescription: "The current directory",
				requiresArg: true
			},
			"output-filename": {
				type: "string",
				describe: "The output filename of the bundle",
				group: OUTPUT_GROUP,
				defaultDescription: "[name].js",
				requiresArg: true
			},
			"output-chunk-filename": {
				type: "string",
				describe: "The output filename for additional chunks",
				group: OUTPUT_GROUP,
				defaultDescription: "filename with [id] instead of [name] or [id] prefixed",
				requiresArg: true
			},
			"output-source-map-filename": {
				type: "string",
				describe: "The output filename for the SourceMap",
				group: OUTPUT_GROUP,
				requiresArg: true
			},
			"output-public-path": {
				type: "string",
				describe: "The public path for the assets",
				group: OUTPUT_GROUP,
				requiresArg: true
			},
			"output-jsonp-function": {
				type: "string",
				describe: "The name of the jsonp function used for chunk loading",
				group: OUTPUT_GROUP,
				requiresArg: true
			},
			"output-pathinfo": {
				type: "boolean",
				describe: "Include a comment with the request for every dependency (require, import, etc.)",
				group: OUTPUT_GROUP
			},
			"output-library": {
				type: "string",
				describe: "Expose the exports of the entry point as library",
				group: OUTPUT_GROUP,
				requiresArg: true
			},
			"output-library-target": {
				type: "string",
				describe: "The type for exposing the exports of the entry point as library",
				group: OUTPUT_GROUP,
				requiresArg: true
			},
			"records-input-path": {
				type: "string",
				describe: "Path to the records file (reading)",
				group: ADVANCED_GROUP,
				requiresArg: true
			},
			"records-output-path": {
				type: "string",
				describe: "Path to the records file (writing)",
				group: ADVANCED_GROUP,
				requiresArg: true
			},
			"records-path": {
				type: "string",
				describe: "Path to the records file",
				group: ADVANCED_GROUP,
				requiresArg: true
			},
			"define": {
				type: "string",
				describe: "Define any free var in the bundle",
				group: ADVANCED_GROUP,
				requiresArg: true
			},
			"target": {
				type: "string",
				describe: "The targeted execution enviroment",
				group: ADVANCED_GROUP,
				requiresArg: true
			},
			"cache": {
				type: "boolean",
				describe: "Enable in memory caching",
				default: true,
				group: ADVANCED_GROUP,
				defaultDescription: "It's enabled by default when watching"
			},
			"watch": {
				type: "boolean",
				alias: "w",
				describe: "Watch the filesystem for changes",
				group: BASIC_GROUP
			},
			"watch-stdin": {
				type: "boolean",
				alias: "stdin",
				describe: "Exit the process when stdin is closed",
				group: ADVANCED_GROUP
			},
			"watch-aggregate-timeout": {
				describe: "Timeout for gathering changes while watching",
				group: ADVANCED_GROUP,
				requiresArg: true
			},
			"watch-poll": {
				type: "boolean",
				describe: "The polling intervall for watching (also enable polling)",
				group: ADVANCED_GROUP
			},
			"hot": {
				type: "boolean",
				describe: "Enables Hot Module Replacement",
				group: ADVANCED_GROUP
			},
			"debug": {
				type: "boolean",
				describe: "Switch loaders to debug mode",
				group: BASIC_GROUP
			},
			"devtool": {
				type: "string",
				describe: "Enable devtool for better debugging experience (Example: --devtool eval-cheap-module-source-map)",
				group: BASIC_GROUP,
				requiresArg: true
			},
			"progress": {
				type: "boolean",
				describe: "Print compilation progress in percentage",
				group: BASIC_GROUP
			},
			"resolve-alias": {
				type: "string",
				describe: "Setup a module alias for resolving (Example: jquery-plugin=jquery.plugin)",
				group: RESOLVE_GROUP,
				requiresArg: true
			},
			"resolve-loader-alias": {
				type: "string",
				describe: "Setup a loader alias for resolving",
				group: RESOLVE_GROUP,
				requiresArg: true
			},
			"optimize-max-chunks": {
				describe: "Try to keep the chunk count below a limit",
				group: OPTIMIZE_GROUP,
				requiresArg: true
			},
			"optimize-min-chunk-size": {
				describe: "Try to keep the chunk size above a limit",
				group: OPTIMIZE_GROUP,
				requiresArg: true
			},
			"optimize-minimize": {
				type: "boolean",
				describe: "Minimize javascript and switches loaders to minimizing",
				group: OPTIMIZE_GROUP
			},
			"optimize-dedupe": {
				type: "boolean",
				describe: "Optimize duplicate module sources in the bundle",
				group: OPTIMIZE_GROUP
			},
			"prefetch": {
				type: "string",
				describe: "Prefetch this request (Example: --prefetch ./file.js)",
				group: ADVANCED_GROUP,
				requiresArg: true
			},
			"provide": {
				type: "string",
				describe: "Provide these modules as free vars in all modules (Example: --provide jQuery=jquery)",
				group: ADVANCED_GROUP,
				requiresArg: true
			},
			"labeled-modules": {
				type: "boolean",
				describe: "Enables labeled modules",
				group: ADVANCED_GROUP
			},
			"plugin": {
				type: "string",
				describe: "Load this plugin",
				group: ADVANCED_GROUP,
				requiresArg: true
			},
			"bail": {
				type: "boolean",
				describe: "Abort the compilation on first error",
				group: ADVANCED_GROUP
			},
			"profile": {
				type: "boolean",
				describe: "Profile the compilation and include information in stats",
				group: ADVANCED_GROUP
			},
			"d": {
				type: "boolean",
				describe: "shortcut for --debug --devtool eval-cheap-module-source-map --output-pathinfo",
				group: BASIC_GROUP
			},
			"p": {
				type: "boolean",
				describe: "shortcut for --optimize-minimize --define process.env.NODE_ENV=\"production\"",
				group: BASIC_GROUP
			}
		}).strict();
};
