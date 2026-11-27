abstract class Foo {
  declare accessor prop7: number;
  private accessor #p: any;

  accessor a!;
  abstract accessor #s;
  accessor #d?;
  abstract accessor f = 1;
  readonly accessor g;
}

declare class C {
  accessor x = 1;
  #y = 1;
}
