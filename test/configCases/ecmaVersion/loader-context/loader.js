/** @type {import("../../../../types").LoaderDefinition<{}>} */
module.exports = function loader(content) {
	const target = this.target;
	const environment = this.environment;

	return `export default ${JSON.stringify({ target, environment})}`;
}
