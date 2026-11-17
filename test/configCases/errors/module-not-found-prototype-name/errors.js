"use strict";

module.exports = [
	[/Can't resolve 'constructor'/, { message: /^(?![\s\S]*BREAKING CHANGE)/ }],
	[/Can't resolve 'toString'/, { message: /^(?![\s\S]*BREAKING CHANGE)/ }],
	[/Can't resolve 'hasOwnProperty'/, { message: /^(?![\s\S]*BREAKING CHANGE)/ }]
];
