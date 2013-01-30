/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function NullDependencyTemplate() {}
module.exports = NullDependencyTemplate;

NullDependencyTemplate.prototype.apply = function(dep, source, outputOptions, requestShortener) {};
