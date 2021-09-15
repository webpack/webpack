import "./a";
it("should compile", () => import(/* webpackChunkName: "async" */ "./async"));
import "./b";
import "./c";
