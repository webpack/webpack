async (x = (function await() {})) => {};
async ([x = function await() {}]) => {};
async ({ [function await() {}]: x }) => {};
async (x = async (y = function await() {}) => {}) => {};
function f() {
  async (x = function await() {}) => {};
}
