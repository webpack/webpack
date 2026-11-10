exports.abc = "abc";
exports.default = "default";
const flagIt = () => (exports.__esModule = true);

const query = __resourceQuery;
if (query.includes("yes")) flagIt();
