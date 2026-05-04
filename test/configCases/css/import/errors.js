"use strict";

module.exports = () => [
	/Can't resolve 'non-exported-css'/,
	/Can't resolve '\.\/directory'/,
	/Package path \.\/non-valid\.css is exported from package (.+), but no valid target file was found/,
	/Can't resolve '\.\/no-extension-in-request'/
];
