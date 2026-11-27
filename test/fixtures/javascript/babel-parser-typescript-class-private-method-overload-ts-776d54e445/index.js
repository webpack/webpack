class Test {
  #f(x: string): number;
  #f(x: number): string;
  #f(x: string | number): string | number {
    return (typeof x === 'string') ? parseInt(x) : x.toString();
  }
}
