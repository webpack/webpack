module.exports = {
	resolve: {
		preferAbsolute: true,
		plugins: [
			{
				apply(resolver) {
					resolver.hooks.file.tap("Test", (request, resolverContext) => {
						if (/test.configCases.*test.configCases/.test(request.path))
							throw new Error("Trying to resolve as root path");
					});
				}
			}
		]
	}
};
