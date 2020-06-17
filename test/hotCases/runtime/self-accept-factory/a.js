require("./hot")(module);

let callback;

module.exports = cb => (callback = cb);
module.hot.dispose(data => (data.callback = callback));

---

require("./hot")(module);
require("./b");

module.hot.data.callback();
