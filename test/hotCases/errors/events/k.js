import i from "./i";
export default i;

if (module.hot) {
	module.hot.accept(
		"./i",
		() => {},
		(err, { moduleId, dependencyId }) => {
			throw new Error(
				`Error in accept error handler: ${moduleId} -> ${dependencyId}`
			);
		}
	);
}
