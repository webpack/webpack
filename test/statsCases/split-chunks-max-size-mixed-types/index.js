const g = "grp";
Promise.all([
  import(/* webpackChunkName: "grp" */ "./n1.css"),
  import(/* webpackChunkName: "grp" */ "./n2.bin"),
  import(/* webpackChunkName: "grp" */ "./n3.js"),
  import(/* webpackChunkName: "grp" */ "./n4.bin"),
  import(/* webpackChunkName: "grp" */ "./n5.bin"),
  import(/* webpackChunkName: "grp" */ "./n7.bin")
]).then(() => console.log(g));
