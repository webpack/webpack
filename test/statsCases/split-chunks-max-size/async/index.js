Promise.all([
  import(/* webpackChunkName: "async-b" */ "./a"),
  import(/* webpackChunkName: "async-b" */ "./b")
]).then(([a, b]) => {
  a;
  b;
})
