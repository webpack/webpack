
      const tag = String.raw;
      const extraordinarilyLongIdentifier = 6;
      const \u0065scapedIdentifier = extraordinarilyLongIdentifier / 2;
      const templateResult = tag`value ${import('template-edge')}`;
      class LongClassName {
        #privateField = import('class-edge');
        method () { return /import\('ignored'\)/.test(''); }
      }
       import('nbsp-edge');
      export { templateResult, LongClassName };
    