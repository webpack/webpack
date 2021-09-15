import "./c";
it("should compile", () => import(/* webpackChunkName: "async" */ "./async"));
import "./b";
import "./a";
