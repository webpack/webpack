/**
 * @this {import("../../../../").LoaderContext<{}>}
 */
module.exports = function (content) {
	this.virtualResource = this.virtualResource.replace(/\.jpe?g$/, ".webp");
	return content;
}
