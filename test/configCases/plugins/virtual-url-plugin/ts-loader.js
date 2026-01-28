/** @type {import("../../../../").LoaderDefinition} */
module.exports = function(source) {
  const callback = this.async();

  const withoutInterfaces = source.replace(/interface\s+\w+(\s*extends\s+\w+)?\s*\{[^}]*\}/g, '');
    
  callback(null, withoutInterfaces);
};
