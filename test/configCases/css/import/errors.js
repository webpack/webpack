"use strict";

const isMainBranches = Boolean(JSON.parse(process.env.MAIN_BRANCHES || "0"));

module.exports = () => [
	/Can't resolve 'non-exported-css'/,
	/Can't resolve '\.\/directory'/,
	isMainBranches
		? /Package path \.\/non-valid\.css is exported from package (.+), but no valid target file was found/
		: /Can't resolve 'condition-names-subpath\/non-valid\.css'/,
	/Can't resolve '\.\/no-extension-in-request'/
];
