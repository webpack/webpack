// use our loader
console.dir(require("./loader!./file"));

// use built-in css loader
console.dir(require("./test.css")); // default by extension
console.dir(require("!css-loader!./test.css")); // manual
