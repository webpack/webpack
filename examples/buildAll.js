/* eslint node/no-unsupported-features: "off" */
const { join } = require("path");
const { statSync, readdirSync } = require("fs");
const { execa, log } = require("../../fluents/chain/fluent-cli");

log.registerCatch();
const debug = false;

/**
 * @TODO could also just `require` and call `cwd`
 *
 * @desc
 *   read dir
 *   resolve to absolute path
 *   ensure directory & not node_modules
 *   add cwd to process.env, dereferences
 *   call child process for each cwd
 * @type {Array<Promise>}
 */
const builds = readdirSync(__dirname)
.map(dirname => join(__dirname, dirname))
.filter(dirname =>
	statSync(dirname).isDirectory() &&
	!dirname.includes("node_modules")
)
.sort()
.map(dirname => Object.assign(Object.assign({}, process.env), { cwd: dirname }))
.map(cmd => execa.shell("node build.js", cmd)
	.then(result =>
		log.blue(cmd.cwd).echo() &&
		log.yellow("result stdout").data(result.stdout).echo(debug))
);

/**
 * catch errors, when error, log stdout
 * otherwise log done
 * @type {Promise}
 */
Promise.all(builds)
.then(() => {
	log.green("done building all");
})
.catch(e => {
	const er = e.stdout.split("\n🚨").shift().trim();
	console.log(er);
});
