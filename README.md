[![webpack](http://webpack.github.io/assets/logo.png)](http://webpack.github.io)

[![NPM version](https://badge.fury.io/js/webpack.png)](http://badge.fury.io/js/webpack) [![Gitter chat](http://img.shields.io/gitter/webpack/webpack.png)](https://gitter.im/webpack/webpack) [![Gittip donate button](http://img.shields.io/gittip/sokra.png)](https://www.gittip.com/sokra/)

[documentation](http://webpack.github.io/docs/?utm_source=github&utm_medium=readme&utm_campaign=top)

# Introduction

Webpack is a bundler for modules. Its main purpose is to bundle JavaScript files for usage in a browser.

**TL; DR**

* bundles [CommonJs](http://www.commonjs.org/specs/modules/1.0/) and [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) modules. (even combined)
* can create a single bundle or multiple chunks loaded on demand, to reduce initial loading time.
* dependencies are resolved during compilation reducing the runtime size
* loaders can preprocess files while compiling, i. e. coffee-script to javascript

Check the [documentation](http://webpack.github.io/docs/?utm_source=github&utm_medium=readme&utm_campaign=trdr) if you want to know more.

# Installation

project:
`npm install webpack --save-dev`

global:
`npm install webpack -g`

# Examples

Take a look at the [`examples`](https://github.com/webpack/webpack/tree/master/examples) folder.



# Features

## Plugins

Webpack has a [rich plugin interface](http://webpack.github.io/docs/plugins.html). Most of the features in Webpack use this plugin interface. This makes Webpack very **flexible**.

## Performance

Webpack uses async I/O and has multiple caching levels. This makes Webpack fast--and **incredibly** fast** on incremental compilations.

## Loaders

Webpack enables the usage of loaders to preprocess files. This allows you to bundle **any static resource**, not just Javascript. You can easily [write your own loaders](http://webpack.github.io/docs/loaders.html) using Node.js.

## Support

Webpack supports **AMD and CommonJS** modules. It performs clever, static analyses on the AST of your code. It even has an evaluation engine to evaluate simple expressions. This allows you to **support most existing libraries**.

## Code Splitting

Webpack allows you to split your codebase into multiple chunks. Chunks are loaded **on-demand**. This reduces the initial loading time.

## Optimization

Webpack optimizes in several ways. It also makes your chunks **cache-friendly** by using hashes.

# A small example of what's possible

``` javascript
// Webpack is a module bundler.
// This means Webpack takes modules with dependencies
// and emits static assets representing those modules.
 
// Dependencies can be written in CommonJs
var commonjs = require("./commonjs");
// or in AMD
define(["amd-module", "../file"], function (amdModule, file) {
	// while previous constructs are sync,
	// this is async
	require(["big-module/big/file"], function (big) {
		 // For async dependencies, Webpack splits
		 // your application into multiple "chunks."
		 // This part of your application is
		 // loaded on demand (code-splitting).
		var stuff = require("../my/stuff");
		// "../my/stuff" is also loaded on-demand
		//  because it's in the callback function
		//  of the AMD require.
	});
});
 
 
require("coffee!./cup.coffee");
// "Loaders" are used to preprocess files.
// They can be prefixed in the require call
// or configured in the configuration.
require("./cup");
// This does the same when you add ".coffee" to the extensions
// and configure the "coffee" loader for /\.coffee$/

function loadTemplate (name) {
	return require("./templates/" + name + ".jade");
	// Many expressions are supported in require calls.
	// A clever parser extracts information and concludes
	// that everything in "./templates" that matches
	// /\.jade$/ should be included in the bundle, as it
	// can be required.
}
  
  
// ...and you can combine everything.
function loadTemplateAsync (name, callback) {
	require(["bundle?lazy!./templates/" + name + ".jade"], 
	  function (templateBundle) {
	          templateBundle(callback);
	});
}
```

## Documentation

[documentation](http://webpack.github.io/docs/?utm_source=github&utm_medium=readme&utm_campaign=documentation)

## Tests

You can run the Node tests with `npm test`. [![build status (linux)](https://secure.travis-ci.org/webpack/webpack.png)](http://travis-ci.org/webpack/webpack) [![Build status (windows)](https://ci.appveyor.com/api/projects/status/vatlasj366jiyuh6/branch/master)](https://ci.appveyor.com/project/sokra/webpack/branch/master)

You can run the browser tests:

```
cd test/browsertests
node build
```

and open `tests.html` in the browser.


## Contribution

You are welcome to contribute by opening an issue or by issuing a pull request.
It would be nice if you open-sourced your own loaders or web-modules. :)

You are also welcome to correct any spelling mistakes or any language issues, because my English is not perfect.

If you want to discuss something or just need help, [here is a gitter.im room](https://gitter.im/webpack/webpack).

## License

Copyright (c) 2012-2014 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)

## Sponsor

This is a free-time project. The time I invest in it fluctuates. If you use Webpack for a serious task, and you'd like me to invest more time on it, please donate. This project increases your income/productivity too. It makes development and applications faster and it reduces the required bandwidth.

I'm very thankful for every dollar. If you leave your username or email, I may show my thanks by giving you extra support.

[![Donate to sokra](http://img.shields.io/donate/sokra.png)](http://sokra.github.io/)


## Dependencies

* [esprima](http://esprima.org/)
* [enhanced-resolve](https://github.com/webpack/enhanced-resolve)
* [uglify-js](https://github.com/mishoo/UglifyJS)
* [mocha](https://github.com/visionmedia/mocha)
* [should](https://github.com/visionmedia/should.js)
* [optimist](https://github.com/substack/node-optimist)
* [async](https://github.com/caolan/async)
* [mkdirp](https://github.com/substack/node-mkdirp)
* [clone](https://github.com/pvorb/node-clone)

[![Dependency Status](https://david-dm.org/webpack/webpack.png)](https://david-dm.org/webpack/webpack)
