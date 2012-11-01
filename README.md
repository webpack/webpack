[![webpack](http://webpack.github.com/assets/logo.png)](http://webpack.github.com)

As developer you want to reuse existing code.
As with node.js and web all files are already in the same language, but it is extra work to use your code with the node.js module system and the browser.

The goal of `webpack` is to bundle CommonJs (and AMD) modules into javascript files which can be loaded by `<script>`-tags.
Simply concatenating all required files has a disadvantage: many code to download (and execute) on page load.
Therefore `webpack` uses the `require.ensure` function ([CommonJs/Modules/Async/A](http://wiki.commonjs.org/wiki/Modules/Async/A)) to split your code automatically into multiple bundles which are loaded on demand.
This happens mostly transparent to the developer.
Dependencies are resolved for you.
The result is a smaller initial code download which results in faster page load.

Another common thing in web development is that some files have to be preprocessed before send to the client (ex. template files).
This introduce more complexity to the compile step.
`webpack` supports loaders which process files before including them.
You as developer can use such files like any other module.

**TL;DR**

* bundle [CommonJs](/webpack/webpack/tree/master/examples/commonjs/) and/or [AMD](/webpack/webpack/tree/master/examples/mixed/) modules for browser
* reuse server-side code (node.js) on client-side
* create multiple files which are loaded on demand (faster page load in big webapps or on mobile connections)
* dependencies managed for you, on compile time (no resolution on runtime needed)
* loaders can preprocess files

## Quick start guide

``` javascript
var moduleA = require("module/file");
var moduleB = require("./relativeFile");
var moduleC = require("../stuff/cup.coffee");
function getTemplate(name) {
	return require("./templates/" + name + ".jade");
}
require("bootstrap/less/bootstrap.less");
```

``` shell
npm install webpack -g
webpack lib/yourEntryModule.js output/bundle.js
```

## Goals

* make node.js and browser development similar
* minimize code size (mobile connection)
 * minimize code size on initial download
 * download code only on demand
* require minimal configuration, but offer a maximum
 * load polyfills for node-specific things if used
 * offer replacements for node buildin libraries

# Examples

See [example webapp](http://webpack.github.com/example-app/).

More [examples](https://github.com/webpack/webpack/tree/master/examples).

## Simple Example

``` javascript
// a.js
var b = require("./b");
b.stuff("It works");

// b.js
exports.stuff = function(text) {
	console.log(text);
}
```

are compiled to (reformatted)

``` javascript
(/* small webpack header */)
({
0: function(module, exports, require) {

	var b = require(1);
	b.stuff("It works");

},
1: function(module, exports, require) {

	exports.stuff = function(text) {
		console.log(text)
	}

}
})
```

## Code Splitting

### Example

``` javascript
var a = require("a");
var b = require("b");
require.ensure(["c"], function(require) {
	require("b").xyz();
	var d = require("d");
});
```

```
File 1: web.js
- code of that file
- code of module a and dependencies
- code of module b and dependencies

File 2: 1.web.js
- code of module c and dependencies (but code is not used)
- code of module d and dependencies
```

Initially only `web.js` is included (and loaded) by your application.
`1.web.js` is loaded when the call to `require.ensure` happens.
After the second bundle (`1.web.js`) is loaded, the callback function will be invoked.

See [details](/webpack/webpack/tree/master/examples/code-splitting) for exact output.

See [more examples](/webpack/webpack/tree/master/examples).

## Reusing node.js code

`webpack` was built to support most of the code that was coded for node.js environment.
For example this works out of the box:

* `require("./templates/" + templateName);`
* `require(condition ? "moduleA" : condition2 ? "moduleB" : "./localStuff");`
* `function xyz(require) { require("text"); } xyz(function(a) { console.log(a) });`
* `var r = require; r("./file");` with warning
* `function xyz(require) { require("./file"); } xyz(require);` with warning
* `try { require("missingModule"); } catch(e) { console.log("missing") }` with warning
* `var require = function(a) { console.log(a) }; require("text");`
* `if(condition) require("optionalModule")` with warning if missing

## Browser replacements

Somethings it happens that browsers require other code than node.js do.
`webpack` allow module developers to specify replacements which are used in the compile process of `webpack`.

Modules in `web_modules` replace modules in `node_modules`.
`filename.web.js` replaces `filename.js` when required without file extension.

in options: `alias: { "http": "http-browserify" }`

in shell: `--alias http=http-browserify`

## Contexts

If the required module is not known while compile time we get into a problem.
A solution is the method `require.context` which takes a directory as parameter
and returns a function which behaves like the `require` function issued from a file
in this directory (but only if used for files in that directory).
The whole directory is included while compiling, so you have access to all files in it.

### Example

We have a directory full of templates, which are compiled javascript files.
A template should be loaded by template name.

``` javascript
var requireTemplate = require.context("./templates");
function getTemplate(templateName) {
	return requireTemplate("./" + templateName);
}
```

In addition to that `webpack` uses the `require.context` function automatically
if you use variables or other not parse-able things in the `require` function.
That means the following code behaves like the above:

``` javascript
function getTemplate(templateName) {
	return require("./templates/" + templateName);
}
// is compiled like: return require.context("./templates")("./"+templateName)
// which compiles to: return require(123)("./"+templateName)
```

See [details](/webpack/webpack/tree/master/examples/require.context) for complete example.

When try to store the `require` function in another variable or try to pass it as parameter,
`webpack` convert it to a `require.context(".")` to be compatible.
There is a warning emitted in this case.

*Warning: The complete code in the directory are included. So use it carefully.*

## Loaders

You can use a syntax for loader plugins to preprocess files before emitting javascript code to the bundle.

The following example loads the raw content of a file with the `raw` loader:

``` javascript
var content = require("raw!./file.txt");
```

Multiple loader plugins can be prepended by separating them with `!`.
The loader plugins are resolved like in normal `require` call but with different default extension.

The `raw` loader plugin is looked up at modules `raw-webpack-web-loader`, `raw-webpack-loader`, `raw-web-loader`, `raw-loader`, `raw`
and the following files are looked up: `index.webpack-web-loader.js`, `index.webpack-loader.js`, `index.web-loader.js`, `index.loader.js`, `index`, `index.js`.
Note that the `web-` versions are omitted if loaders are used in node.js.

See [example](/webpack/webpack/tree/master/examples/loader).

The following loaders are included in webpack:

* [`raw`](https://github.com/webpack/raw-loader): Loads raw content of a file (as utf-8)
* [`json`](https://github.com/webpack/json-loader) (default at `.json`): Loads file as JSON
* [`jade`](https://github.com/webpack/jade-loader) (default at `.jade`): Loads jade template and returns a function
* [`coffee`](https://github.com/webpack/coffee-loader) (default at `.coffee`): Loads coffee-script like javascript
* [`css`](https://github.com/webpack/css-loader): Loads css file with resolved imports and returns css code
* [`less`](https://github.com/webpack/less-loader): Loads and compiles a less file and returns css code
* [`val`](https://github.com/webpack/val-loader): Excutes code as module and consider exports as javascript code
* [`bundle`](https://github.com/webpack/bundle-loader): Wraps request in a `require.ensure` block
* [`file`](https://github.com/webpack/file-loader): Emits the file into the output folder and returns the (relative) url (`file/{ext}` for some extensions)
* [`style`](https://github.com/webpack/style-loader): Adds result of javascript execution to DOM
* [`script`](https://github.com/webpack/script-loader): Executes a javascript file once in global context (like in script tag), requires are not parsed. Use this to include a library. ex. `require("script!./jquery.min.js")`. This is synchron, so the `$` variable is available after require.
* (`.css` defaults to `style!css` loader, so all css rules are added to DOM)
* (`.less` defaults to `style!css!val/cacheable!less` loader, so all less rules are added to DOM)

See docs for loader in github repo of the loader.

[Bigger list of loaders](https://github.com/webpack/webpack/wiki/Loaders)

## TL;DR

``` javascript
var a = require("a"); // require modules
var b = require("./b"); // and files
                          // like in node.js

// polyfill require method to use the new members in node.js too
require = require("enhanced-require")(module);

// create a lazy loaded bundle
require.ensure([], function(require) {
	var c = require("c");

	// require json
	var packageJson = require("../package.json");

	// or jade templates, coffee-script, and many more with own loaders
	var result = require("./template.jade")(require("./dataFrom.coffee"));

	// files are compiled to javascript and packed into the bundle...
});
```

... and compile from the shell with:

```
webpack lib/input.js js/output.js
```

try `--min` to minimize with `uglify-js`.

## Limitations

### `require`-function

* `require` should not be overwritten, except from polyfill
* `require.ensure` should not be overwritten or called indirect
* `require.context` should not be overwritten or called indirect
* the argument to `require.context` should be a literal or addition of multiple literals
* An indirect call of `require` should access a file in current directory: This throws an exception: `var r = require; r("../file");`

The following cases could result in **too much code** in result file if used wrong:

* indirect call of `require`: `var r = require; r("./file");`. It includes the whole directory.
* `require.context`. It includes the whole directory.
* expressions in require arguments: `require(variable)`. It includes the whole directory. (except from `?:`-operator `require(condition ? "a" : "b")`)
* the function passed to `require.ensure` is not inlined in the call. Only requires in inlined function move into the second bundle.


### node.js specific modules

As node.js specific modules like `fs` will not work in browser they are not included (by default) and cause an exception.
You should replace them by own modules if you want to use them.
For some simple modules are replacements included in `webpack`.
Expensive replacements are not needed by everyone, so that are not included by default.
You need to specify `--alias [module]=[replacement]` to use them.
A warning saying that some module is missing is emitted in the case you use it without providing a replacement.

Some credit goes to the browserify contributors, you can use replacements provided by them.

Included simple replacements:

* `assert`: copy of node.js' version, small change
* `buffer`: copy of node-browserify's version
* `buffer_ieee754`: copy of node-browserify's version
* `child_process`: disabled
* `events`: copy of node.js' version
* `path`: copy of node.js' version
* `punycode`: copy of node.js' version, one line removed (http://mths.be/punycode by @mathias)
* `querystring`: copy of node.js' version
* `string_decoder`: copy of node.js' version
* `url`: copy of node.js' version
* `util`: copy of node.js' version

Here is a list of possible useful replacements: (intentionally not by default)

* `http=http-browserify`
* `vm=vm-browserify`
* TODO provide some more replacements

## Usage

### Shell

`webpack` offers a command line interface:

after `npm install webpack -g` you can use the `webpack` command

if invoked without arguments it prints a usage:

```
Usage: webpack <options> <input> <output>

Options:
  --min            Minimize it with uglifyjs                                [boolean]  [default: false]
  --filenames      Output Filenames Into File                               [boolean]  [default: false]
  --options        Options JSON File                                        [string]
  --public-prefix  Path Prefix For JavaScript Loading                       [string]
  --libary         Stores the exports into this variable                    [string]
  --colors         Output Stats with colors                                 [boolean]  [default: false]
  --single         Disable lazy loading                                     [boolean]  [default: false]
  --json           Output Stats as JSON                                     [boolean]  [default: false]
  --by-size        Sort modules by size in Stats                            [boolean]  [default: false]
  --verbose        Output dependencies in Stats                             [boolean]  [default: false]
  --profile        Capture timings for modules                              [boolean]  [default: false]
  --alias          Set a alias name for a module. ex. http=http-browserify  [string]
  --debug          Prints debug info to output files                        [boolean]  [default: false]
  --watch          Recompiles on changes (except loaders)                   [boolean]  [default: false]
  --watch-delay    Timeout to wait for the last change
  --workers        Use worker processes to be faster (BETA)                 [boolean]  [default: false]
  --progress       Displays a progress while compiling                      [boolean]  [default: false]
```

### Programmatically Usage

``` javascript
webpack(context, moduleName, options, callback)
webpack(absoluteModulePath, options, callback)
```

#### `options`

You can also save this options object in a JSON file and use it with the shell command.

``` javascript
{
 output: "out/file.js", // required
 // output file to initial chunk

 outputDirectory: "out/dir", // default: extract directory from output
 // output directory for file

 outputPostfix: ".chunk.js", // default: "." + output
 // postfix appended to id of lazy loaded chunks

 context: "/home/node/stuff",
 // default: [context] parameter if Programmatically Usage
 // default: process.cwd() if Shell Usage
 // paths in stats and debug sourceUrl are shortened to this base directory

 ouputJsonpFunction: "myJsonp", // default: "webpackJsonp"
 // jsonp function used for lazy loaded chunks,
 // should be unique for all instances of webpack in a page

 publicPrefix: "http://static.url.com/asserts/", // default: ""
 // path to create the chunks url relative to page
 // deprecated name: scriptSrcPrefix

 libary: "mylib", // default: null
 // store the exports of the entrace module in a variable of this name
 // use this to create a libary from webpack

 includeFilenames: true, // default: false
 // include the filename of each module as comment before the module

 single: false, // default: false
 // ignore all Code Splitting and emit only a single file
 // all code is included and should work as with Code Splitting

 debug: true, // default: false
 // put the source of the modules into annotated eval,
 // which cause a nice debug experience in some dev tools

 watch: true, // default: false
 // recompiles on changes on module and contexts (currently not on loaders)
 // unchanged files are cached for greater performance

 watchDelay: 1000, // default: 200
 // delay in ms before recompile after the last file change

 events: new EventEmitter(), // default: new EventEmitter()
 // EventEmitter on which events for the compile process are fired
 // events:
 //  -- bundling process --
 //  "bundle"           (stats) the bundle is finished
 //  "bundle-invalid"   () fired when the bundle gets invalid
 //         [bundle-invalid is only fired in watch mode]
 //  "start-writing"    (hash) fired when webpack starts writing
 //  "watch-end"        () watch ended because of loader change
 //  -- events for modules --
 //  "module"           (module, filename) after a module is loaded
 //  "context-enum"     (module, dirname) before a context is enumerated
 //  "context"          (module, dirname) after a context is loaded
 //  -- events for progress --
 //  "task"             (name?) start of a task
 //  "task-end"         (name?) end of a task

 noWrite: true, // default: undefined
 // if true webpack do not write out any file

 parse: {
  // options for parsing

  overwrites: {
   "myglobal": "modulename-of-myglobal"
   // defaults: (defaults are also included if you define your own)
   // process: "__webpack_process",
   // module: "__webpack_module",
   // console: "__webpack_console",
   // global: "__webpack_global",
   // Buffer: "buffer+.Buffer" // -> require("buffer").Buffer
   // "__dirname": "__webpack_dirname",
   // "__filename": "__webpack_filename"
  },
  // inject a free variable named "myglobal" which are required as
  // require("modulename-of-myglobal")
  // to each module which uses "myglobal"
 }

 resolve: {
  // options for resolving

  paths: ["/my/absolute/dirname"],
  // default: (defaults are also included if you define your own)
  //   [".../buildin",
  //     ".../buildin/web_modules", ".../buildin/name_modules",
  //     ".../node_modules"]
  // search paths for modules

  modulesDirectorys: ["jam", "xyz_modules", "node_modules"],
  // default: (defaults are NOT included if you define your own)
  //  ["web_modules", "node_modules"];
  // directories to be searched for modules

  alias: {
   "old-module": "new-module"
  },
  // replace a module

  extensions: ["", ".www.js", ".js"],
  // defaults: (defaults are NOT included if you define your own)
  //   ["", ".webpack.js", ".web.js", ".js"]
  // postfixes for files to try

  packageMains: ["abc", "main"]
  // defaults: ["webpack", "browserify", "main"]
  // lookup fields in package.json

  loaderExtensions: [".loader.js", ".www-loader.js", "", ".js"],
  // defaults: (defaults are NOT included if you define your own)
  //   [".webpack-web-loader.js", ".webpack-loader.js",
  //      ".web-loader.js", ".loader.js", "", ".js"]
  // postfixes for loaders to try

  loaderPostfixes: ["-loader", "-xyz", ""],
  // defaults: (defaults are NOT included if you define your own)
  //   ["-webpack-web-loader", "-webpack-loader",
  //      "-web-loader", "-loader", ""]
  // postfixes for loader modules to try

  loaderPackageMains: ["loader", "main"]
  // defaults: ["webpackLoader", "loader", "webpack", "main"]
  // lookup fields for loaders in package.json

  loaders: [{
    test: /\.generator\.js/,
    exclude: /\.no\.generator\.js/,
    loader: "val"
  }],
  // default: (defaults are also included if you define your own)
  //   [{test: /\.coffee$/, loader: "coffee"},
  //    {test: /\.json$/, loader: "json"},
  //    {test: /\.jade$/, loader: "jade"},
  //    {test: /\.css$/, loader: "style!css"},
  //    {test: /\.less$/, loader: "style!css!val!less"}]
  // automatically use loaders if filename match RegExp
  // and no loader is specified.
  // you can pass a RegExp as string, or multiple RegExps/strings in an array

  postprocess: {
   normal: [function(filename, callback) {
    // webpack will not find files including ".exclude."
    if(/\.exclude\.[^\\\/]*$/.test(filename))
	 return callback(new Error("File is excluded"));
	callback(null, filename);
   }],
   // defaults: []
   // postprocess resolved filenames by all specified async functions
   // a postprocessor must call the callback
   // You must pass a filename instead of a function if you use workers
   // The filename is required in the worker process.

   context: [],
   // same as postprocess.normal but for contextes
  }
 }

 postLoaders: [{test: /\.export.js$/, loader: "export"}],
 // default: []
 // syntax like resolve.loaders
 // all loaders which matches the file are applied after the
 // normal loaders. This cannot be overridden in the require call.
 // You must pass a string instead of a RegExp if you use workers

 preLoaders: [{test: /\.txt$|\.html$/, loader: "normalizeNLs"}],
 // default: []
 // syntax like resolve.loaders
 // all loaders which matches the file are applied before the
 // normal loaders. This cannot be overridden in the require call.
 // You must pass a string instead of a RegExp if you use workers

 maxChunks: 5, // (experimental)
 // default: undefined
 // limit the maximum number of chunks.
 // chunks are merged until the required number is reached

 mergeSizeRatio: 2, // (experimental)
 // default: 0.2
 // when choosing the merged chunks the maximum of this formular is searched:
 // sizeSaveByChunkMerging - mergedChunkSize * mergeSizeRatio

 workers: true,
 // default: false
 // options: true, false, number > 0, object of type webpack/lib/Workers
 // Use worker processes to do some work.
 // This *can* boost performance, but starting these processes has some
 //  overhead (~100-200ms). If loaders are used they need to have the
 //  seperable flag to work in worker process. If they havn't they work in
 //  the main process.
 // Pushing jobs to worker processes has an addititional overhead of ~100ms.

 closeWorkers: false,
 // default: true
 // close the worker processes on webpack exit.

 workersNoResolve: true,
 // default: false
 // workers should not be used in the resolving process
 // This may be useful if you want to have your postprocessors in the main process.

 workerMinLoaders: 2,
 // default: 0
 // only process file in seperate process if more or equal loaders applied to the file.

 amd: { jQuery: true },
 // default: {}
 // specify the value of require.amd and define.amd

 profile: true,
 // default: false
 // capture timings for the build.
 // they are stored in the stats
}
```

#### `callback`

`function(err, stats)`

`stats` as json:

``` javascript
{
 hash: "52bd9213...38d",
 startTime: 237467691, // in ms since 1.1.1990
 time: 1234, // in ms
 chunkCount: 2,
 modulesCount: 10,
 modulesIncludingDuplicates: 10,
 modulesFirstChunk: 3,
 fileSizes: {
  "output.js": 1234,
  "1.output.js": 2345
 },
 chunkNameFiles: {
  "main": "output.js",
  "namedChunk": "1.output.js"
 }
 dependencies: [ "filename", ... ],
 loaders: [ "filename of loader", ... ]
 contexts: [ "dirname of context", ... ]
 warnings: [ "Some warning" ],
 errors: [ "Some error" ],
 fileModules: {
  "output.js": [
   {
    id: 0,
    size: 123,
    filename: "/home/.../main.js",
    reasons: [ { type: "main" } ],
    dependencies: [ "filename", ... ],
    loaders: [ "filename of loader", ... ]
   },
   { id: 1, size: 234, filename: "...", reasons: [
    { type: "require", // or "context"
      async: true,
      count: 2,
      filename: "/home/.../main.js",
      // additionally: dirname: "..." // for type = "context"
    }
   ]},
   ...
  ],
  "1.output.js": [...]
 },
 subStats: [...], // stats for embedded webpacks
}
```

### with grunt

see [grunt-webpack](https://github.com/webpack/grunt-webpack).



## Bonus features

### File hash

You can use `[hash]` in `publicPrefix`, `output`, `outputDirectory`, `outputPostfix` and in the shell parameters.
`webpack` will replace it with a hash of your files, when writing.

### From shell

Combine the options `--colors --watch --progress` to get a pretty shell compilation.

### Webpack features in node.js

see [enhanced-require](https://github.com/webpack/enhanced-require).

### More

see [wiki](https://github.com/webpack/webpack/wiki)



## Tests

You can run the unit tests with `npm test`. [![build status](https://secure.travis-ci.org/webpack/webpack.png)](http://travis-ci.org/webpack/webpack)

You can run the browser tests:

```
cd test/browsertests
node build
```

and open `tests.html` in browser.



## Contribution

You are welcome to contribute by writing issues or pull requests.
It would be nice if you open source your own loaders or webmodules. :)

You are also welcome to correct any spelling mistakes or any language issues, because my english is not perfect...



## Future plans

see [https://github.com/webpack/webpack/wiki/Ideas](wiki Ideas)



## License

Copyright (c) 2012 Tobias Koppers

MIT (http://www.opensource.org/licenses/mit-license.php)



## Dependencies

* [esprima](http://esprima.org/)
* [optimist](https://github.com/substack/node-optimist)
* [uglify-js](https://github.com/mishoo/UglifyJS)
* [sprintf](https://github.com/maritz/node-sprintf)