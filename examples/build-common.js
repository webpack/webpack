/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

/* eslint node/no-unsupported-features: "off" */
/* eslint keyword-spacing: "off" */

const { join } = require("path");
const { replaceResults, replaceBase } = require("./template-common");
const fluents = require("fluent-cli");
const { log, File, Script, execa, ChainedMapExtendable, read } = fluents;
log.registerCatch();

/**
 * @param  {Function[]} funcs functions to flow left to right
 * @return {Function} passes args through the functions, bound to this
 */
function flow(...funcs) {
	const length = funcs ? funcs.length : 0;
	return function flowing(...args) {
		let index = 0;
		// eslint-disable-next-line
		let result = length ? funcs[index].apply(this, args) : args[0];

		while (++index < length) {
			// eslint-disable-next-line
			result = funcs[index].call(this, result);
		}
		return result;
	};
}

class Replace {
	constructor(dir) {
		this.dir = dir;
		this.lessStrict = this.lessStrict.bind(this);
	}
	lessStrict(regExpStr) {
		regExpStr = regExpStr
			.replace(/node_modules/g, "(node_modules|~)")
			.replace(/(\\\/|\\\\)/g, "[\\/\\\\]");
		return regExpStr;
	}

	/**
	 * @desc prettify paths & runtime
	 * @param  {string} template replace a readme that has been replaced once
	 * @return {string} regex replaced template
	 */
	base(template) {
		let { dir, lessStrict } = this;

		// webpack comments
		const runtimeRegexp = /(```\s*(?:js|javascript)\n)?(.*)(\/\*\*\*\*\*\*\/ \(function\(modules\) \{ \/\/ webpackBootstrap\n(?:.|\n)*?\n\/\*\*\*\*\*\*\/ \}\)\n\/\**\/\n)/;
		const timeRegexp = /\s*Time: \d+ms/g;

		// path to webpack
		let webpack = join(__dirname, "..");
		let webpackParent = join(__dirname, "..", "..");

		// sanitize regex
		dir = lessStrict(dir.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
		dir = new RegExp(dir, "g");

		// replace the directory path
		webpack = lessStrict(webpack.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
		webpack = new RegExp(webpack, "g");
		webpackParent = lessStrict(
			webpackParent.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")
		);
		webpackParent = new RegExp(webpackParent, "g");

		// simplify output
		// simplify
		return template
			.replace(/[\r\n]/g, "\n")
			.replace(dir, ".")
			.replace(webpack, "(webpack)")
			.replace(webpackParent, "(webpack)/~")
			.replace(timeRegexp, "")
			.replace(/\.chunkhash\./g, ".[chunkhash].")
			.replace(runtimeRegexp, function(match) {
				match = runtimeRegexp.exec(match);
				const prefix = match[1] ? "" : "```\n";
				const inner = match[1] ? match[1] : "``` js\n";
				return (
					prefix +
					"<details><summary><code>" +
					match[2] +
					"/******/ (function(modules) { /* webpackBootstrap */ })</code></summary>\n\n" +
					inner +
					match[2] +
					match[3] +
					"```\n\n</details>\n\n" +
					inner
				);
			});
	}

	/**
	 * @param  {string} template readme template
	 * @param  {string} baseDir  [description]
	 * @param  {string} stdout   [description]
	 * @param  {string} prefix   [description]
	 * @return {string}          [description]
	 */
	results(template, baseDir, stdout, prefix) {
		const regexp = new RegExp(
			"\\{\\{" + (prefix ? prefix + ":" : "") + "([^:\\}]+)\\}\\}",
			"g"
		);
		const prefixIndex = prefix ? prefix.length + 1 : 0;

		return template.replace(regexp, function(match) {
			match = match.substr(2 + prefixIndex, match.length - 4 - prefixIndex);
			if (match === "stdout") return stdout;
			const matchPath = join(baseDir, match);
			return read(matchPath).replace(/[\r\n]*$/, "");
		});
	}
}

/**
 * @NOTE running it this way hides the fact that uglify fails on output first run
 *
 * first run:
 * 	- copies template into readme
 * 	- adds basic uglified contents
 *
 * second run:
 * 	- adds output code,
 * 	- adds source code,
 * 	- adds more verbose output
 *
 * @TODO
 * 	- [ ] make interactive config generator,
 * 			  would be useful in webpack-cli
 *
 * @prop {string} dir process.cwd
 * @prop {boolean} debugInfo whether to output debug info
 * @prop {boolean} debug  whether to output debug info
 *
 * @prop {File} readme readme file chain
 * @prop {File} template template file chain
 * @prop {Script} scripts fluent script chain
 * @prop {Script} script1 ^ for initial compile
 * @prop {Script} script2 ^ for verbose compile
 */
class CommonBuild extends ChainedMapExtendable {
	/**
	 * @param  {string} [dir=process.cwd()] dir to use
	 */
	constructor(dir = process.cwd()) {
		super();

		this.extendBool(["targetArgs", "displayReasons"])
			.targetArgs(true)
			.displayReasons(true);

		this.dir = dir;
		this.readme = File.dir(this.dir).src("README.md").load(true);
		this.template = File.dir(this.dir).src("template.md").load(true);
		this.replacer = new Replace(this.dir);

		this.debug(true);
		log.filter(() => this.debugInfo);
	}

	/**
	 * @example
	 * 	```
	 * 	.debug('info')
	 * 	.debug('verbose')
	 * 	.debug()
	 * 	.debug(false)
	 *  .debug(true)
	 * ```
	 * `
	 * @desc set whether debugging should output or not
	 * @param {boolean | string} [should=true] boolean for basic, string for level
	 * @return {BuildCommon} @chainable
	 */
	debug(should = true) {
		this.debugInfo = !!should;
		this.debugVerbose = false;

		if (typeof should === "string") {
			this.debugVerbose = should === "verbose";
		}

		return this;
	}

	/**
	 * @desc sets up reusable flags for the script
	 * @see BuildCommon.compileInitial, BuildCommon.script
	 * @return {BuildCommon} @chainable
	 */
	setupScripts() {
		this.scripts = new Script();
		this.script = this.scripts.add();
		this.script1 = this.scripts.add();
		this.script2 = this.scripts.add();

		this.script
			.raw("node")
			.raw("../../bin/webpack.js")
			.when(this.get("displayReasons"), () => {
				this.script
					.flag("display-reasons")
					.flag("display-used-exports")
					.flag("display-provided-exports");
			});

		this.script
			.flag("display-chunks")
			.flag("display-modules")
			.flag("display-origins")
			.flag("display-entrypoints")
			.flag("output-public-path")
			.arg("\"js/\"");

		return this;
	}

	/**
	 * @desc sets up scripts off of base
	 * 	script 1:
	 *       is for the `minimal`/gzip output
 	 *       setting up arguments to output
 	 *       the content we want to use in the readme
	 * @desc extends minimal output
	 * @see BuildCommon.compile, BuildCommon.setArgs
	 * @return {BuildCommon} @chainable
	 */
	setArgs() {
		this.script1.raw(this.script.toString());

		this.script2.raw(this.script.toString()).flag("output-pathinfo");

		this.script1.arg(`-p`); // eslint-disable-line

		this.when(this.get("targetArgs"), () => {
			this.script1.arg("./example.js").arg("js/output.js");
			this.script2.arg("./example.js").arg("js/output.js");
		});

		return this;
	}

	/**
	 * @desc add string arguments
	 * @param {string} args to add to the script
 	 * @return {BuildCommon} @chainable
	 */
	addArgs(args = "") {
		args.split(" ").map(arg => this.script.arg(arg));

		return this;
	}

	/**
	 * @desc   update readme from output of building using the common-template
	 * @see    BuildCommon.compileInitial
	 * @param  {string} stdout child process output
	 * @param  {string} [stderr] child process error, when error occurrs
	 * @return {BuildCommon} @chainable
	 */
	updateReadmeInitial(stdout, stderr) {
		log
			.blue("updating readme from template")
			.when(this.debugVerbose, () => log.data({ stdout, stderr }))
			.echo();

		const output = stdout.replace(/[\r\n]*$/, "");
		const contents = this.template.contents;
		const dir = this.dir;

		try {
			const replaced = this.replacer.results(contents, dir, output, "min");
			this.readme.setContent(replaced).write();
		} catch (e) {
			console.log(e);
			log.error(e).echo();
			throw e;
		}

		return this;
	}

	/**
	 * @param  {string} stdout child process output
	 * @return {BuildCommon} @chainable
	 */
	updateReadme(stdout) {
		const output = stdout.replace(/[\r\n]*$/, "");
		const dir = this.dir;
		const { contents, setContent, write } = this.readme;

		log
			.blue("updating readme")
			.when(this.debugVerbose, () => log.data({ output, dir }))
			.echo();

		/**
		 * this time no "min"
		 * replace, replaceBase, setContent, write
		 * same as: `this.readme.setContent(replaceBase(replaceResults(contents, dir, output, ""))).write()`
		 * @type {Function}
		 */
		const replace = flow(replaceResults, replaceBase, setContent, write);
		replace(contents, dir, output, "");

		return this;
	}

	/**
	 * @desc
	 * 	- adds output code,
	 * 	- adds source code,
	 * 	- adds more verbose output
	 *
	 * @see BuildCommon.compileInitial
	 * @see BuildCommon.script2
	 * @return {Promise} child process shell execution
	 */
	compile() {
		const script = this.script2.toString();

		log.bold(script).echo();

		return execa
			.shell(script)
			.then(result => {
				log
					.cyan("second output result (compile)")
					.when(this.debugVerbose, () => log.data({ result, script }))
					.echo();

				this.updateReadme(result.stdout);
				return Promise.resolve(result);
			})
			.catch(log.catchAndThrow);
	}

	/**
	 * @desc copies template into readme, adds basic uglified contents
	 * @see BuildCommon.script
	 * @return {Promise} child process shell execution
	 */
	compileInitial() {
		const script = this.script1.toString();

		log.bold(script).echo();

		return execa
			.shell(script)
			.then(result => {
				log
					.cyan("initial output result (compileInitial)")
					.when(this.debugVerbose, () => log.data({ script, result }))
					.echo();

				this.updateReadmeInitial(result.stdout).compile();

				return Promise.resolve(result);
			})
			.catch(result => {
				log.red("ignoring first run, uglify sometimes fails.").echo();

				this.updateReadmeInitial(result.stdout).compile();

				return Promise.resolve(result);
			});
	}

	/**
	 * @see BuildCommon.compile
	 * @see BuildCommon.compileInitial
	 * @return {BuildCommon} @chainable
	 */
	run() {
		this.setupScripts().setArgs();
		this.compileInitial();
		return this;
	}
}

function commonBuild(obj = {}) {
	return new CommonBuild().from(obj || {}).run();
}

commonBuild.targetArgs = (arg = true) =>
	new CommonBuild().targetArgs(arg).run();
commonBuild.displayReasons = (arg = true) =>
	new CommonBuild().displayReasons(arg).run();
commonBuild.noDisplayReasons = () => commonBuild.displayReasons(false);
commonBuild.noTargetArgs = () => commonBuild.targetArgs(false);

module.exports = commonBuild;
