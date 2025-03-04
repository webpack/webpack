// The loader intentionally throws an error to test error handling for asset modules
module.exports = function() {
  throw new Error("Error in asset processing");
}; 