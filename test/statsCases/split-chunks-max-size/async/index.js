import "../in-some-directory/big?1";
import "../in-some-directory/small?1";
import "../in-some-directory/small?2";
import "../in-some-directory/small?3";
import "../in-some-directory/small?4";
import "../in-some-directory/very-big?1";

Promise.all([
  import(/* webpackChunkName: "async-b" */ "./a"),
  import(/* webpackChunkName: "async-b" */ "./b")
]).then(([a, b]) => {
  a;
  b;
})
