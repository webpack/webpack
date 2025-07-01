/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Haijie Xie @hai-x
*/

"use strict";

/**
 * @type {Readonly<"css">}
 * This is the module type used for CSS files.
 */
const CSS_MODULE_TYPE = "css";

/**
 * @type {Readonly<"css/global">}
 * This is the module type used for CSS modules files where you need to use `:local` in selector list to hash classes.
 */
const CSS_MODULE_TYPE_GLOBAL = "css/global";

/**
 * @type {Readonly<"css/module">}
 * This is the module type used for CSS modules files, by default all classes are hashed.
 */
const CSS_MODULE_TYPE_MODULE = "css/module";

/**
 * @type {Readonly<"css/auto">}
 * This is the module type used for CSS files, the module will be parsed as CSS modules if it's filename contains `.module.` or `.modules.`.
 */
const CSS_MODULE_TYPE_AUTO = "css/auto";

module.exports.CSS_MODULE_TYPE = CSS_MODULE_TYPE;
module.exports.CSS_MODULE_TYPE_GLOBAL = CSS_MODULE_TYPE_GLOBAL;
module.exports.CSS_MODULE_TYPE_MODULE = CSS_MODULE_TYPE_MODULE;
module.exports.CSS_MODULE_TYPE_AUTO = CSS_MODULE_TYPE_AUTO;
