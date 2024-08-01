"use strict";

const handleExport = options => {
	const isES6DefaultExported =
		typeof options === "object" &&
		options !== null &&
		typeof options.default !== "undefined";
	options = isES6DefaultExported ? options.default : options;
	return options;
};

const handleFunction = (options, argv) => {
	if (typeof options === "function") {
		options = options(argv.env, argv);
	}
	return options;
};

module.exports = (options, argv) => {
	argv = argv || {};

	options = handleExport(options);

	options = Array.isArray(options)
		? options.map(_options => handleFunction(_options, argv))
		: handleFunction(options, argv);
	return options;
};
