"use strict";

module.exports = [
	[
		/export 'absent' \(imported as 'absent'\) was not found in '\.\/named\/index\.js' \(possible exports: present\)/
	],
	[
		/export 'absentMixed' \(imported as 'absentMixed'\) was not found in '\.\/mixed\/index\.js' \(possible exports: local, deferred\)/
	],
	[
		/export 'absentDefault' \(imported as 'absentDefault'\) was not found in '\.\/defaults\/index\.js' \(possible exports: default\)/
	],
	[
		/export 'absentUsed' \(imported as 'absentUsed'\) was not found in '\.\/used\/index\.js' \(possible exports: present\)/
	]
];
