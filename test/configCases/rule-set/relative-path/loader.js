/** @type {import("../../../../").LoaderDefinition<{value: string}>} */
module.exports = function(source) {
  const options = this.getOptions();
  return `module.exports = ${JSON.stringify(options.value)};`
};
