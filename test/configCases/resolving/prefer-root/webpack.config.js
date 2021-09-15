module.exports = {
	resolve: {
		plugins: [
			{
				apply(resolver) {
					resolver.hooks.file.tap("Test", (request, resolverContext) => {
						if (request.path === "/index.js")
							throw new Error("Trying to resolve as absolute path");
					});
				}
			}
		]
	}
};
