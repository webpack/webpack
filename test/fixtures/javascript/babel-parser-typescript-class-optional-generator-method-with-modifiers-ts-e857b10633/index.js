class C {
  private *a?() { }
  public *b?() { }
  static *c?() { }
  protected *g?() { }
}

class A {
  private *[a?.a]?() { }
  public *[b?.b]?() { }
  static *[c?.c]?() { }
  protected *[g?.g]?() { }
}
