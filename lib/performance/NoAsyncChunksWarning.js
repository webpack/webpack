/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sean Larkin @thelarkinn
*/
function NoAsyncChunksWarning() {
	Error.call(this);
	Error.captureStackTrace(this, NoAsyncChunksWarning);
	this.name = "NoAsyncChunksWarning";

	this.message = "webpack performance recommendations: \n" +
		"You can limit the size of your bundles by using System.import() or require.ensure to lazy load some parts of your application.\n" +
		"For more info visit https://webpack.github.io/docs/code-splitting.html";
}
module.exports = NoAsyncChunksWarning;

NoAsyncChunksWarning.prototype = Object.create(Error.prototype);
NoAsyncChunksWarning.prototype.constructor = NoAsyncChunksWarning;
