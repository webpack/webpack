module.exports = {
	resolve: {
		enforceExtension: true,
		extensions: [".js", "", ".json"],
		plugins: [
			{
				apply(resolver) {
					resolver.hooks.result.tap("Test", (request, resolverContext) => {
						if (/a$|a\.json$/.test(request.path))
							throw new Error(
								`Trying to resolve respecting resolve.extensions order ${request.path}`
							);

						if (/b.json$/.test(request.path))
							throw new Error(
								`Trying to resolve respecting resolve.extensions order ${request.path}`
							);
					});
				}
			}
		]
	}
};
