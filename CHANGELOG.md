# Changelog

> **Tags:**
> - [API]
> - [Breaking Change]
> - [Bug Fix]
> - [Documentation]
> - [CI]
> - [Internal]
> - [New Feature]
> - [Performance]
> - [Polish]

To see the date or details of each release check the [Releases](https://github.com/webpack/webpack/releases) page

## 1.12.8

* **Bug Fix**
	* Fix CommonsChunkPlugin issue when using multiple commons chunks and other optimizations

## 1.12.7

* **Bug Fix**
 	* Remove -c config alias in the CLI, alias already used
 	* Remove -h hot alias in the CLI, alias already used
	* Fix CommonsChunkPlugin issue when passing mixed existing chunks and not existing names
* **New Feature**
 	* Add support for returning Promise and ES6 default export from configuration

## 1.12.6

**NO CHANGES**

## 1.12.5

* **Internal**
 	* Bumping `uglify-js`dependency version (mitigating bugs in 2.5.0)
* **Performance**
	* Store `this` context in an upper scope to improve compilation performance

## 1.12.4

* **Bug Fix**
	* Force relative path for module require [`loader-utils` Issue #14](https://github.com/webpack/loader-utils/pull/14)

## 1.12.3

* **Bug Fix**
	* Fix the absolute path used in NodeStuffPlugin
	* Fix fail when undefined module is coming to footer generator
	* Storing `recordsPath` paths relative to `options.context` [Issue #295](https://github.com/webpack/webpack/issues/295)
* **Documentation**
	* Added DLLPlugin and DLLReferencePlugin example 
* **Internal**
 	* Bumping `uglify-js`dependency version 
* **Polish**
 	* Updates to automated testing ([See release](https://github.com/webpack/webpack/compare/v1.12.2...v1.12.3) for details)
	* Adding HMR test cases
 	* Resetting uglify's base54 counters for each file 
 
## 1.12.2

* **Polish**
 	* Add native-image plugin to electron target
 	* Add -c config alias to the CLI
 	* Complain more clearly when output filename is missing
 	* Fixing stats test 

## 1.12.1

* **Bug Fix**
	* Fixing Define Plugin caching issue [Issue #1415](https://github.com/webpack/webpack/issues/1415)
 	* Name an AMD module in an UMD target if `library` is set [Issue #989](https://github.com/webpack/webpack/issues/989)
* **Internal**
 	* Bumping `uglify-js`dependency version 
* **Polish**
  	* Send `exit(0)` when stdin is closed

## 1.12

* **API**
 	* Emit empty argument list for AMD in UMD
* **Internal**
  	* Update to esprima 2
* **CI**
 	* Test on node.js and io.js, Test for beautify source code


