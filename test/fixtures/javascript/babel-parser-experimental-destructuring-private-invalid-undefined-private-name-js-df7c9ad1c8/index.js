class C {
  m() {
    ({#a: a}) => {};
    async ({#b: b}) => {};
    var {#c: c} = {};
    for ({#d: d} in {});
    ({ #e: c } = {});
  }
}
