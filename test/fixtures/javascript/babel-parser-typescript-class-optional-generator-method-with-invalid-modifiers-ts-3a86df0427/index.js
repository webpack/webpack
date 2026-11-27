class C {
  abstract *d?() { }
  readonly *e?() { }
  declare *f?() { }
}

class A {
  abstract *[d?.d]?() { }
  readonly *[e?.e]?() { }
  declare *[f?.f]?() { }
}

