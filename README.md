[![webpack](http://webpack.github.io/assets/logo.png)](http://webpack.github.io)

# This fork adds support for split point error handling

## Usage

```javascript
var JsonpErrorHandlerPlugin = require('webpack/lib/JsonpErrorHandlerPlugin');
var RequireEnsureErrorHandlerPlugin = require('webpack/lib/dependencies/RequireEnsureErrorHandlerPlugin');
var AMDRequireErrorHandlerPlugin = require('webpack/lib/dependencies/AMDRequireErrorHandlerPlugin');

{
	plugins: [
		new JsonpErrorHandlerPlugin(),
        new RequireEnsureErrorHandlerPlugin(),
        new AMDRequireErrorHandlerPlugin()
	]
}
```

## JsonpErrorHandlerPlugin
Adds an error callback to the jsonp transport method that is called when a chunk fails to load.

## RequireEnsureErrorHandlerPlugin
Adds support for the following signatures:

```javascript
require.ensure(['a'], function() {
    // success
}, function() {
    // error
}, 'a');

require.ensure(['b'], function() {
    // success
}, function() {
    // error
});

require.ensure(['c'], function() {
    // success
}, 'c');

require.ensure(['d'], function() {
    // success
});
```

## AMDRequireErrorHandlerPlugin
Adds support for the following signatures:

```javascript
require(['a']);

require(['b'], function() {
	// success
});

require(['c'], function() {
	// success
}, function() {
	// error
});
```

## Related
- https://github.com/webpack/webpack/issues/758
- https://github.com/webpack/webpack/pull/692
- https://github.com/webpack/webpack/pull/763


## Todo
- [ ] Add support for named chunks using AMD, i.e. require(name?, deps, successCallback?, errorCallback?)
- [ ] Update `bundle-loader` to support new `require.ensure` syntax.
- [ ] Move out into separate plugin repo.
- [ ] *Remove hacks* required to get this to work by, potentially, requesting changes to webpack to make it easier to hook in.

[![NPM version](https://badge.fury.io/js/webpack.png)](http://badge.fury.io/js/webpack) [![Gitter chat](http://img.shields.io/gitter/webpack/webpack.png)](https://gitter.im/webpack/webpack) [![Gittip donate button](http://img.shields.io/gittip/sokra.png)](https://www.gittip.com/sokra/)

[documentation](http://webpack.github.io/docs/?utm_source=github&utm_medium=readme&utm_campaign=top)

# Introduction

webpack is a bundler for modules. The main purpose is to bundle javascript
files for usage in a browser, yet it is also capable of transforming, bundling,
or packaging just about any resource or asset.


**TL;DR**

* Bundles both [CommonJs](http://www.commonjs.org/specs/modules/1.0/) and [AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) modules (even combined).
* Can create a single bundle or multiple chunks that are asynchronously loaded at runtime (to reduce initial loading time).
* Dependencies are resolved during compilation reducing the runtime size.
* Loaders can preprocess files while compiling, e.g. coffeescript to javascript, handlebars strings to compiled functions, images to Base64, etc.
* Highly modular plugin system to do whatever else your application requires.

# Getting Started

Check out webpack's [documentation](http://webpack.github.io/docs/?utm_source=github&utm_medium=readme&utm_campaign=trdr) for quick Getting Started guide, in-depth usage,
tutorials and resources.

# Installation

project:
`npm install webpack --save-dev`

global:
`npm install webpack -g`
Usage
http://webpack.github.io/docs/tutorials/getting-started/

# Examples

Take a look at the [`examples`](https://github.com/webpack/webpack/tree/master/examples) folder.

# Features

## Plugins

webpack has a [rich plugin
interface](http://webpack.github.io/docs/plugins.html). Most of the features
within webpack itself use this plugin interface. This makes webpack very
**flexible**.


## Performance

webpack uses async I/O and has multiple caching levels. This makes webpack fast
and incredibly **fast** on incremental compilations.

## Loaders

webpack enables use of loaders to preprocess files. This allows you to bundle
**any static resource** way beyond javascript. You can easily [write your own
loaders](http://webpack.github.io/docs/loaders.html) using node.js. 

Loaders are activated by using `loadername!` prefixes in `require()` statements,
or are automatically applied via regex from your webpack configuration.

Please see [Using Loaders](http://webpack.github.io/docs/using-loaders.html) for more information.

**basic**
* [`json`](https://github.com/webpack/json-loader): Loads file as JSON
* [`raw`](https://github.com/webpack/raw-loader): Loads raw content of a file (as utf-8)
* [`val`](https://github.com/webpack/val-loader): Executes code as module and consider exports as JavaScript code
* [`script`](https://github.com/webpack/script-loader): Executes a JavaScript file once in global context (like in script tag), requires are not parsed.

**packaging**
* [`file`](https://github.com/webpack/file-loader): Emits the file into the output folder and returns the (relative) url.
* [`url`](https://github.com/webpack/url-loader): The url loader works like the file loader, but can return a Data Url if the file is smaller than a limit.
* [`image`](https://github.com/tcoopman/image-webpack-loader): Compresses your images. Ideal to use together with `file` or `url`.
* [`svgo-loader`](https://github.com/pozadi/svgo-loader): Compresses SVG images using [svgo](https://github.com/svg/svgo) library
* [`baggage`](https://github.com/deepsweet/baggage-loader): Automatically require any resources related to the required one
* [`polymer-loader`](https://github.com/JonDum/polymer-loader): Process HTML & CSS with preprocessor of choice and `require()` Web Components like first-class modules.

**dialects**
* [`coffee`](https://github.com/webpack/coffee-loader): Loads coffee-script like JavaScript
* [`babel`](https://github.com/babel/babel-loader): Turn ES6 code into vanilla ES5 using [Babel](https://github.com/babel/babel).
* [`livescript`](https://github.com/appedemic/livescript-loader): Loads LiveScript like JavaScript
* [`sweetjs`](https://github.com/jlongster/sweetjs-loader): Use sweetjs macros. 
* [`traceur`](https://github.com/jupl/traceur-loader): Use future JavaScript features with [Traceur](https://github.com/google/traceur-compiler).
* [`typescript`](https://github.com/andreypopp/typescript-loader): Loads TypeScript like JavaScript.

**templating**
* [`html`](https://github.com/webpack/html-loader): Exports HTML as string, require references to static resources.
* [`jade`](https://github.com/webpack/jade-loader): Loads jade template and returns a function
* [`handlebars`](https://github.com/altano/handlebars-loader): Loads handlebars template and returns a function
* [`ractive`](https://github.com/rstacruz/ractive-loader): Pre-compiles Ractive templates for interactive DOM manipulation
* [`markdown`](https://github.com/peerigon/markdown-loader): Compiles Markdown to HTML
* [`ng-cache`](https://github.com/teux/ng-cache-loader): Puts HTML partials in the Angular's $templateCache

**styling**
* [`style`](https://github.com/webpack/style-loader): Add exports of a module as style to DOM
* [`css`](https://github.com/webpack/css-loader): Loads css file with resolved imports and returns css code
* [`less`](https://github.com/webpack/less-loader): Loads and compiles a less file
* [`sass`](https://github.com/jtangelder/sass-loader): Loads and compiles a scss file
* [`stylus`](https://github.com/shama/stylus-loader): Loads and compiles a stylus file

**misc**
* [`po`](https://github.com/dschissler/po-loader): Loads a PO gettext file and returns JSON
* [`mocha`](https://github.com/webpack/mocha-loader): Do tests with mocha in browser or node.js
* [`eslint`](https://github.com/MoOx/eslint-loader): PreLoader for linting code using ESLint.
* [`jshint`](https://github.com/webpack/jshint-loader): PreLoader for linting code.
* [`jscs`](https://github.com/unindented/jscs-loader): PreLoader for style checking.
* [`injectable`](https://github.com/jauco/webpack-injectable): Allow to inject dependencies into modules
* [`transform`](https://github.com/webpack/transform-loader): Use browserify transforms as loader.

For the full list of loaders, see [list of loaders](http://webpack.github.io/docs/list-of-loaders.html).

## Module Format (AMD/CommonJS)

webpack supports **both** AMD and CommonJS module styles. It performs clever static
analysis on the AST of your code. It even has an evaluation engine to evaluate
simple expressions. This allows you to **support most existing libraries** out of the box.

## Code Splitting

webpack allows you to split your codebase into multiple chunks. Chunks are
loaded asynchronously at runtime. This reduces the initial loading time.

[Code Splitting documentation](http://webpack.github.io/docs/code-splitting.html)

## Optimizations

webpack can do many optimizations to **reduce the output size of your
javascript** by deduplicating frequently used modules, minifying, and giving
you full control of what is loaded initially and what is loaded at runtime
through code splitting. It can also can make your code chunks **cache
friendly** by using hashes. 

[Optimization documentation](http://webpack.github.io/docs/optimization.html)


# A small example of what's possible

``` javascript
// webpack is a module bundler
// This means webpack takes modules with dependencies
//   and emits static assets representing those modules.

// dependencies can be written in CommonJs
var commonjs = require("./commonjs");
// or in AMD
define(["amd-module", "../file"], function(amdModule, file) {
	// while previous constructs are sync
	// this is async
	require(["big-module/big/file"], function(big) {
		 // for async dependencies webpack splits
		 //  your application into multiple "chunks".
		 // This part of your application is
		 //  loaded on demand (Code Splitting)
		var stuff = require("../my/stuff");
		// "../my/stuff" is also loaded on demand
		//  because it's in the callback function
		//  of the AMD require
	});
});


require("coffee!./cup.coffee");
// "Loaders" can be used to preprocess files.
// They can be prefixed in the require call
//  or configured in the configuration.
require("./cup");
// This does the same when you add ".coffee" to the extensions
//  and configure the "coffee" loader for /\.coffee$/


function loadTemplate(name) {
	return require("./templates/" + name + ".jade");
	// many expressions are supported in require calls
	// a clever parser extracts information and concludes
	//  that everything in "./templates" that matches
	//  /\.jade$/ should be included in the bundle, as it
	//  can be required.
}


// ... and you can combine everything
function loadTemplateAsync(name, callback) {
	require(["bundle?lazy!./templates/" + name + ".jade"],
	  function(templateBundle) {
		templateBundle(callback);
	});
}
```



## Documentation

[documentation](http://webpack.github.io/docs/?utm_source=github&utm_medium=readme&utm_campaign=documentation)


## Changelog

[changelog](http://webpack.github.io/docs/changelog.html)


## Tests

You can run the node tests with `npm test`. [![build status (linux)](https://secure.travis-ci.org/webpack/webpack.png)](http://travis-ci.org/webpack/webpack) [![Build status (windows)](https://ci.appveyor.com/api/projects/status/vatlasj366jiyuh6/branch/master)](https://ci.appveyor.com/project/sokra/webpack/branch/master)

You can run the browser tests:

```
cd test/browsertests
node build
```

and open `tests.html` in browser.


## Contribution

Most of the time, if webpack is not working correctly for you it is a simple configuration issue.

If you are still having difficulty after looking over your configuration carefully, please post
a question to [StackOverflow with the webpack tag](http://stackoverflow.com/tags/webpack). Questions
that include your webpack.config.js and relevant files are more likely to receive responses.

If you have discovered a bug or have a feature suggestion, feel free to create an issue on Github.

If you create a loader or plugin, please consider open sourcing it, putting it
on NPM and following the `x-loader`, `x-plugin` convention.

You are also welcome to correct any spelling mistakes or any language issues.

If you want to discuss something or just need help, [here is our gitter.im room](https://gitter.im/webpack/webpack).


## License

Copyright (c) 2012-2015 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)


## Sponsor

This is a freetime project. My time investment fluctuates randomly. If you use webpack for a serious task you may want me to invest more time. Or if you make some good revenue you can give some money back. Keep in mind that this project may increase your income. It makes development and applications faster and reduces the required bandwidth.

I'm very thankful for every dollar. If you leave your username or email I may show my thanks by giving you extra support.

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
