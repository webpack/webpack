const SyncBailHook = require("tapable/lib/SyncBailHook");
const { Logger } = require("./Logger");
const logToConsole = require("./logToConsole");

/** @type {logToConsole.LoggerOptions} */
let currentDefaultLoggerOptions = {
	level: "info",
	debug: false
};
let currentDefaultLogger = logToConsole(currentDefaultLoggerOptions);

/**
 * @param {string} name name of the logger
 * @returns {Logger} a logger
 */
exports.getLogger = name => {
	return new Logger((type, args) => {
		if (exports.hooks.log.call(name, type, args) === undefined) {
			currentDefaultLogger(name, type, args);
		}
	});
};

/**
 * @param {logToConsole.LoggerOptions} options new options, merge with old options
 * @returns {void}
 */
exports.configureDefaultLogger = options => {
	Object.assign(currentDefaultLoggerOptions, options);
	currentDefaultLogger = logToConsole(currentDefaultLoggerOptions);
};

exports.hooks = {
	log: new SyncBailHook(["origin", "type", "args"])
};
