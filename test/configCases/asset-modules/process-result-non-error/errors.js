"use strict";

module.exports = [
	[
		{ moduleName: /file\.png$/ },
		/^Module build failed \(from processResult hook\):\nNonErrorEmittedError: \(Emitted value instead of an instance of Error\) re-encoding gave up/
	]
];
