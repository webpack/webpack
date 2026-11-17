
      // dynamic
      const { a } = await import('a');
      const { b } = await import.source('b');
      // static
      import b from 'b';
      import { c } from 'c';
      import source z from 'z';
      // meta
      import.meta.url
    