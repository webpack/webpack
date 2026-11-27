class X {
  static a = new.target;
  static b = (foo = 1 + bar(new.target));
  static c = () => new.target;
  static d = (foo = new.target) => {};
  e = new.target;
  f = (foo = 1 + bar(new.target));
  g = () => new.target;
  h = (foo = new.target) => {};
}
