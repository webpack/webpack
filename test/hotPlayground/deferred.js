// Imported with `import defer`, so this body does not run until something
// first touches the namespace — click the panel's button to force it.

console.log("[playground] deferred.js evaluated");

module.exports = { evaluatedAt: new Date().toISOString() };
