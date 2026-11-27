function async() {}

[async()] = [];
({ a: async() } = {});

async() &&= 1;

import("")++;

class A extends B {
  constructor() {
    super()++;
  }
}

