// Polyfill require for node.js usage of loaders
require = require("enhanced-require")(module);

// use our loader
console.dir(require("./loader!./file"));

// use buildin json loader
console.dir(require("./test.json")); // default by extension
console.dir(require("!json!./test.json")); // manual