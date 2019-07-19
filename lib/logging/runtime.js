const SyncBailHook = require("tapable/lib/SyncBailHook");
const { Logger } = require("./Logger");
const logToConsole = require("./logToConsole");

exports.getLogger = name => {
	return new Logger((type, args) => {
		if (exports.hooks.log.call(name, type, args) === undefined) {
			logToConsole(name, type, args);
		}
	});
};

exports.hooks = {
	log: new SyncBailHook(["origin", "type", "args"])
};
