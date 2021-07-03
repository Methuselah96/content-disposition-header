const assert = require('assert');
const deepEqual = require('deep-equal');
const contentDisposition = require('..');

describe('contentDisposition.create()', () => {
  it('should create an attachment header', () => {
    assert.strictEqual(contentDisposition.create(), 'attachment');
  });
});

describe('contentDisposition.create(filename)', () => {
  it('should require a string', () => {
    assert.throws(contentDisposition.create.bind(null, 42),
      /filename.*string/);
  });

  it('should create a header with file name', () => {
    assert.strictEqual(contentDisposition.create('plans.pdf'),
      'attachment; filename="plans.pdf"');
  });

  it('should use the basename of the string', () => {
    assert.strictEqual(contentDisposition.create('/path/to/plans.pdf'),
      'attachment; filename="plans.pdf"');
  });

  describe('when "filename" is US-ASCII', () => {
    it('should only include filename parameter', () => {
      assert.strictEqual(contentDisposition.create('plans.pdf'),
        'attachment; filename="plans.pdf"');
    });

    it('should escape quotes', () => {
      assert.strictEqual(contentDisposition.create('the "plans".pdf'),
        'attachment; filename="the \\"plans\\".pdf"');
    });
  });

  describe('when "filename" is ISO-8859-1', () => {
    it('should only include filename parameter', () => {
      assert.strictEqual(contentDisposition.create('«plans».pdf'),
        'attachment; filename="«plans».pdf"');
    });

    it('should escape quotes', () => {
      assert.strictEqual(contentDisposition.create('the "plans" (1µ).pdf'),
        'attachment; filename="the \\"plans\\" (1µ).pdf"');
    });
  });

  describe('when "filename" is Unicode', () => {
    it('should include filename* parameter', () => {
      assert.strictEqual(contentDisposition.create('планы.pdf'),
        'attachment; filename="?????.pdf"; filename*=UTF-8\'\'%D0%BF%D0%BB%D0%B0%D0%BD%D1%8B.pdf');
    });

    it('should include filename fallback', () => {
      assert.strictEqual(contentDisposition.create('£ and € rates.pdf'),
        'attachment; filename="£ and ? rates.pdf"; filename*=UTF-8\'\'%C2%A3%20and%20%E2%82%AC%20rates.pdf');
      assert.strictEqual(contentDisposition.create('€ rates.pdf'),
        'attachment; filename="? rates.pdf"; filename*=UTF-8\'\'%E2%82%AC%20rates.pdf');
    });

    it('should encode special characters', () => {
      assert.strictEqual(contentDisposition.create('€\'*%().pdf'),
        'attachment; filename="?\'*%().pdf"; filename*=UTF-8\'\'%E2%82%AC%27%2A%25%28%29.pdf');
    });
  });

  describe('when "filename" contains hex escape', () => {
    it('should include filename* parameter', () => {
      assert.strictEqual(contentDisposition.create('the%20plans.pdf'),
        'attachment; filename="the%20plans.pdf"; filename*=UTF-8\'\'the%2520plans.pdf');
    });

    it('should handle Unicode', () => {
      assert.strictEqual(contentDisposition.create('€%20£.pdf'),
        'attachment; filename="?%20£.pdf"; filename*=UTF-8\'\'%E2%82%AC%2520%C2%A3.pdf');
    });
  });
});

describe('contentDisposition.create(filename, options)', () => {
  describe('with "fallback" option', () => {
    it('should require a string or Boolean', () => {
      assert.throws(contentDisposition.create.bind(null, 'plans.pdf', { fallback: 42 }),
        /fallback.*string/);
    });

    it('should default to true', () => {
      assert.strictEqual(contentDisposition.create('€ rates.pdf'),
        'attachment; filename="? rates.pdf"; filename*=UTF-8\'\'%E2%82%AC%20rates.pdf');
    });

    describe('when "false"', () => {
      it('should not generate ISO-8859-1 fallback', () => {
        assert.strictEqual(contentDisposition.create('£ and € rates.pdf', { fallback: false }),
          'attachment; filename*=UTF-8\'\'%C2%A3%20and%20%E2%82%AC%20rates.pdf');
      });

      it('should keep ISO-8859-1 filename', () => {
        assert.strictEqual(contentDisposition.create('£ rates.pdf', { fallback: false }),
          'attachment; filename="£ rates.pdf"');
      });
    });

    describe('when "true"', () => {
      it('should generate ISO-8859-1 fallback', () => {
        assert.strictEqual(contentDisposition.create('£ and € rates.pdf', { fallback: true }),
          'attachment; filename="£ and ? rates.pdf"; filename*=UTF-8\'\'%C2%A3%20and%20%E2%82%AC%20rates.pdf');
      });

      it('should pass through ISO-8859-1 filename', () => {
        assert.strictEqual(contentDisposition.create('£ rates.pdf', { fallback: true }),
          'attachment; filename="£ rates.pdf"');
      });
    });

    describe('when a string', () => {
      it('should require an ISO-8859-1 string', () => {
        assert.throws(contentDisposition.create.bind(null, '€ rates.pdf', { fallback: '€ rates.pdf' }),
          /fallback.*iso-8859-1/i);
      });

      it('should use as ISO-8859-1 fallback', () => {
        assert.strictEqual(contentDisposition.create('£ and € rates.pdf', { fallback: '£ and EURO rates.pdf' }),
          'attachment; filename="£ and EURO rates.pdf"; filename*=UTF-8\'\'%C2%A3%20and%20%E2%82%AC%20rates.pdf');
      });

      it('should use as fallback even when filename is ISO-8859-1', () => {
        assert.strictEqual(contentDisposition.create('"£ rates".pdf', { fallback: '£ rates.pdf' }),
          'attachment; filename="£ rates.pdf"; filename*=UTF-8\'\'%22%C2%A3%20rates%22.pdf');
      });

      it('should do nothing if equal to filename', () => {
        assert.strictEqual(contentDisposition.create('plans.pdf', { fallback: 'plans.pdf' }),
          'attachment; filename="plans.pdf"');
      });

      it('should use the basename of the string', () => {
        assert.strictEqual(contentDisposition.create('€ rates.pdf', { fallback: '/path/to/EURO rates.pdf' }),
          'attachment; filename="EURO rates.pdf"; filename*=UTF-8\'\'%E2%82%AC%20rates.pdf');
      });

      it('should do nothing without filename option', () => {
        assert.strictEqual(contentDisposition.create(undefined, { fallback: 'plans.pdf' }),
          'attachment');
      });
    });
  });

  describe('with "type" option', () => {
    it('should default to attachment', () => {
      assert.strictEqual(contentDisposition.create(),
        'attachment');
    });

    it('should require a string', () => {
      assert.throws(contentDisposition.create.bind(null, undefined, { type: 42 }),
        /invalid type/);
    });

    it('should require a valid type', () => {
      assert.throws(contentDisposition.create.bind(null, undefined, { type: 'invlaid;type' }),
        /invalid type/);
    });

    it('should create a header with inline type', () => {
      assert.strictEqual(contentDisposition.create(undefined, { type: 'inline' }),
        'inline');
    });

    it('should create a header with inline type & filename', () => {
      assert.strictEqual(contentDisposition.create('plans.pdf', { type: 'inline' }),
        'inline; filename="plans.pdf"');
    });

    it('should normalize type', () => {
      assert.strictEqual(contentDisposition.create(undefined, { type: 'INLINE' }),
        'inline');
    });
  });
});

describe('contentDisposition.parse(string)', () => {
  it('should require string', () => {
    assert.throws(contentDisposition.parse.bind(null), /argument string.*required/);
  });

  it('should reject non-strings', () => {
    assert.throws(contentDisposition.parse.bind(null, 42), /argument string.*required/);
  });

  describe('with only type', () => {
    it('should reject quoted value', () => {
      assert.throws(contentDisposition.parse.bind(null, '"attachment"'),
        /invalid type format/);
    });

    it('should reject trailing semicolon', () => {
      assert.throws(contentDisposition.parse.bind(null, 'attachment;'),
        /invalid.*format/);
    });

    it('should parse "attachment"', () => {
      deepEqual(contentDisposition.parse('attachment'), {
        type: 'attachment',
        parameters: {},
      });
    });

    it('should parse "inline"', () => {
      deepEqual(contentDisposition.parse('inline'), {
        type: 'inline',
        parameters: {},
      });
    });

    it('should parse "form-data"', () => {
      deepEqual(contentDisposition.parse('form-data'), {
        type: 'form-data',
        parameters: {},
      });
    });

    it('should parse with trailing LWS', () => {
      deepEqual(contentDisposition.parse('attachment \t '), {
        type: 'attachment',
        parameters: {},
      });
    });

    it('should normalize to lower-case', () => {
      deepEqual(contentDisposition.parse('ATTACHMENT'), {
        type: 'attachment',
        parameters: {},
      });
    });
  });

  describe('with parameters', () => {
    it('should reject trailing semicolon', () => {
      assert.throws(contentDisposition.parse.bind(null, 'attachment; filename="rates.pdf";'),
        /invalid parameter format/);
    });

    it('should reject invalid parameter name', () => {
      assert.throws(contentDisposition.parse.bind(null, 'attachment; filename@="rates.pdf"'),
        /invalid parameter format/);
    });

    it('should reject missing parameter value', () => {
      assert.throws(contentDisposition.parse.bind(null, 'attachment; filename='),
        /invalid parameter format/);
    });

    it('should reject invalid parameter value', () => {
      assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=trolly,trains'),
        /invalid parameter format/);
    });

    it('should reject invalid parameters', () => {
      assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=total/; foo=bar'),
        /invalid parameter format/);
    });

    it('should reject duplicate parameters', () => {
      assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=foo; filename=bar'),
        /invalid duplicate parameter/);
    });

    it('should reject missing type', () => {
      assert.throws(contentDisposition.parse.bind(null, 'filename="plans.pdf"'),
        /invalid type format/);
      assert.throws(contentDisposition.parse.bind(null, '; filename="plans.pdf"'),
        /invalid type format/);
    });

    it('should lower-case parameter name', () => {
      deepEqual(contentDisposition.parse('attachment; FILENAME="plans.pdf"'), {
        type: 'attachment',
        parameters: { filename: 'plans.pdf' },
      });
    });

    it('should parse quoted parameter value', () => {
      deepEqual(contentDisposition.parse('attachment; filename="plans.pdf"'), {
        type: 'attachment',
        parameters: { filename: 'plans.pdf' },
      });
    });

    it('should parse & unescape quoted value', () => {
      deepEqual(contentDisposition.parse('attachment; filename="the \\"plans\\".pdf"'), {
        type: 'attachment',
        parameters: { filename: 'the "plans".pdf' },
      });
    });

    it('should include all parameters', () => {
      deepEqual(contentDisposition.parse('attachment; filename="plans.pdf"; foo=bar'), {
        type: 'attachment',
        parameters: { filename: 'plans.pdf', foo: 'bar' },
      });
    });

    it('should parse parameters separated with any LWS', () => {
      deepEqual(contentDisposition.parse('attachment;filename="plans.pdf" \t;    \t\t foo=bar'), {
        type: 'attachment',
        parameters: { filename: 'plans.pdf', foo: 'bar' },
      });
    });

    it('should parse token filename', () => {
      deepEqual(contentDisposition.parse('attachment; filename=plans.pdf'), {
        type: 'attachment',
        parameters: { filename: 'plans.pdf' },
      });
    });

    it('should parse ISO-8859-1 filename', () => {
      deepEqual(contentDisposition.parse('attachment; filename="£ rates.pdf"'), {
        type: 'attachment',
        parameters: { filename: '£ rates.pdf' },
      });
    });
  });

  describe('with extended parameters', () => {
    it('should reject quoted extended parameter value', () => {
      assert.throws(contentDisposition.parse.bind(null, 'attachment; filename*="UTF-8\'\'%E2%82%AC%20rates.pdf"'),
        /invalid extended.*value/);
    });

    it('should parse UTF-8 extended parameter value', () => {
      deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'\'%E2%82%AC%20rates.pdf'), {
        type: 'attachment',
        parameters: { filename: '€ rates.pdf' },
      });
    });

    it('should parse UTF-8 extended parameter value', () => {
      deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'\'%E2%82%AC%20rates.pdf'), {
        type: 'attachment',
        parameters: { filename: '€ rates.pdf' },
      });
      deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'\'%E4%20rates.pdf'), {
        type: 'attachment',
        parameters: { filename: '\ufffd rates.pdf' },
      });
    });

    it('should parse ISO-8859-1 extended parameter value', () => {
      deepEqual(contentDisposition.parse('attachment; filename*=ISO-8859-1\'\'%A3%20rates.pdf'), {
        type: 'attachment',
        parameters: { filename: '£ rates.pdf' },
      });
      deepEqual(contentDisposition.parse('attachment; filename*=ISO-8859-1\'\'%82%20rates.pdf'), {
        type: 'attachment',
        parameters: { filename: '? rates.pdf' },
      });
    });

    it('should not be case-sensitive for charser', () => {
      deepEqual(contentDisposition.parse('attachment; filename*=utf-8\'\'%E2%82%AC%20rates.pdf'), {
        type: 'attachment',
        parameters: { filename: '€ rates.pdf' },
      });
    });

    it('should reject unsupported charset', () => {
      assert.throws(contentDisposition.parse.bind(null, 'attachment; filename*=ISO-8859-2\'\'%A4%20rates.pdf'),
        /unsupported charset/);
    });

    it('should parse with embedded language', () => {
      deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'en\'%E2%82%AC%20rates.pdf'), {
        type: 'attachment',
        parameters: { filename: '€ rates.pdf' },
      });
    });

    it('should prefer extended parameter value', () => {
      deepEqual(contentDisposition.parse('attachment; filename="EURO rates.pdf"; filename*=UTF-8\'\'%E2%82%AC%20rates.pdf'), {
        type: 'attachment',
        parameters: { filename: '€ rates.pdf' },
      });
      deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'\'%E2%82%AC%20rates.pdf; filename="EURO rates.pdf"'), {
        type: 'attachment',
        parameters: { filename: '€ rates.pdf' },
      });
    });
  });

  describe('from TC 2231', () => {
    describe('Disposition-Type Inline', () => {
      it('should parse "inline"', () => {
        deepEqual(contentDisposition.parse('inline'), {
          type: 'inline',
          parameters: {},
        });
      });

      it('should reject ""inline""', () => {
        assert.throws(contentDisposition.parse.bind(null, '"inline"'),
          /invalid type format/);
      });

      it('should parse "inline; filename="foo.html""', () => {
        deepEqual(contentDisposition.parse('inline; filename="foo.html"'), {
          type: 'inline',
          parameters: { filename: 'foo.html' },
        });
      });

      it('should parse "inline; filename="Not an attachment!""', () => {
        deepEqual(contentDisposition.parse('inline; filename="Not an attachment!"'), {
          type: 'inline',
          parameters: { filename: 'Not an attachment!' },
        });
      });

      it('should parse "inline; filename="foo.pdf""', () => {
        deepEqual(contentDisposition.parse('inline; filename="foo.pdf"'), {
          type: 'inline',
          parameters: { filename: 'foo.pdf' },
        });
      });
    });

    describe('Disposition-Type Attachment', () => {
      it('should parse "attachment"', () => {
        deepEqual(contentDisposition.parse('attachment'), {
          type: 'attachment',
          parameters: {},
        });
      });

      it('should reject ""attachment""', () => {
        assert.throws(contentDisposition.parse.bind(null, '"attachment"'),
          /invalid type format/);
      });

      it('should parse "ATTACHMENT"', () => {
        deepEqual(contentDisposition.parse('ATTACHMENT'), {
          type: 'attachment',
          parameters: {},
        });
      });

      it('should parse "attachment; filename="foo.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="foo.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo.html' },
        });
      });

      it('should parse "attachment; filename="0000000000111111111122222""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="0000000000111111111122222"'), {
          type: 'attachment',
          parameters: { filename: '0000000000111111111122222' },
        });
      });

      it('should parse "attachment; filename="00000000001111111111222222222233333""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="00000000001111111111222222222233333"'), {
          type: 'attachment',
          parameters: { filename: '00000000001111111111222222222233333' },
        });
      });

      it('should parse "attachment; filename="f\\oo.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="f\\oo.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo.html' },
        });
      });

      it('should parse "attachment; filename="\\"quoting\\" tested.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="\\"quoting\\" tested.html"'), {
          type: 'attachment',
          parameters: { filename: '"quoting" tested.html' },
        });
      });

      it('should parse "attachment; filename="Here\'s a semicolon;.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="Here\'s a semicolon;.html"'), {
          type: 'attachment',
          parameters: { filename: 'Here\'s a semicolon;.html' },
        });
      });

      it('should parse "attachment; foo="bar"; filename="foo.html""', () => {
        deepEqual(contentDisposition.parse('attachment; foo="bar"; filename="foo.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo.html', foo: 'bar' },
        });
      });

      it('should parse "attachment; foo="\\"\\\\";filename="foo.html""', () => {
        deepEqual(contentDisposition.parse('attachment; foo="\\"\\\\";filename="foo.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo.html', foo: '"\\' },
        });
      });

      it('should parse "attachment; FILENAME="foo.html""', () => {
        deepEqual(contentDisposition.parse('attachment; FILENAME="foo.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo.html' },
        });
      });

      it('should parse "attachment; filename=foo.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename=foo.html'), {
          type: 'attachment',
          parameters: { filename: 'foo.html' },
        });
      });

      it('should reject "attachment; filename=foo,bar.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=foo,bar.html'),
          /invalid parameter format/);
      });

      it('should reject "attachment; filename=foo.html ;"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=foo.html ;'),
          /invalid parameter format/);
      });

      it('should reject "attachment; ;filename=foo"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; ;filename=foo'),
          /invalid parameter format/);
      });

      it('should reject "attachment; filename=foo bar.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=foo bar.html'),
          /invalid parameter format/);
      });

      it('should parse "attachment; filename=\'foo.bar\'', () => {
        deepEqual(contentDisposition.parse('attachment; filename=\'foo.bar\''), {
          type: 'attachment',
          parameters: { filename: '\'foo.bar\'' },
        });
      });

      it('should parse "attachment; filename="foo-ä.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="foo-ä.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo-ä.html' },
        });
      });

      it('should parse "attachment; filename="foo-Ã¤.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="foo-Ã¤.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo-Ã¤.html' },
        });
      });

      it('should parse "attachment; filename="foo-%41.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="foo-%41.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo-%41.html' },
        });
      });

      it('should parse "attachment; filename="50%.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="50%.html"'), {
          type: 'attachment',
          parameters: { filename: '50%.html' },
        });
      });

      it('should parse "attachment; filename="foo-%\\41.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="foo-%\\41.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo-%41.html' },
        });
      });

      it('should parse "attachment; name="foo-%41.html""', () => {
        deepEqual(contentDisposition.parse('attachment; name="foo-%41.html"'), {
          type: 'attachment',
          parameters: { name: 'foo-%41.html' },
        });
      });

      it('should parse "attachment; filename="ä-%41.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="ä-%41.html"'), {
          type: 'attachment',
          parameters: { filename: 'ä-%41.html' },
        });
      });

      it('should parse "attachment; filename="foo-%c3%a4-%e2%82%ac.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="foo-%c3%a4-%e2%82%ac.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo-%c3%a4-%e2%82%ac.html' },
        });
      });

      it('should parse "attachment; filename ="foo.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename ="foo.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo.html' },
        });
      });

      it('should reject "attachment; filename="foo.html"; filename="bar.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename="foo.html"; filename="bar.html"'),
          /invalid duplicate parameter/);
      });

      it('should reject "attachment; filename=foo[1](2).html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=foo[1](2).html'),
          /invalid parameter format/);
      });

      it('should reject "attachment; filename=foo-ä.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=foo-ä.html'),
          /invalid parameter format/);
      });

      it('should reject "attachment; filename=foo-Ã¤.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=foo-Ã¤.html'),
          /invalid parameter format/);
      });

      it('should reject "filename=foo.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'filename=foo.html'),
          /invalid type format/);
      });

      it('should reject "x=y; filename=foo.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'x=y; filename=foo.html'),
          /invalid type format/);
      });

      it('should reject ""foo; filename=bar;baz"; filename=qux"', () => {
        assert.throws(contentDisposition.parse.bind(null, '"foo; filename=bar;baz"; filename=qux'),
          /invalid type format/);
      });

      it('should reject "filename=foo.html, filename=bar.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'filename=foo.html, filename=bar.html'),
          /invalid type format/);
      });

      it('should reject "; filename=foo.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, '; filename=foo.html'),
          /invalid type format/);
      });

      it('should reject ": inline; attachment; filename=foo.html', () => {
        assert.throws(contentDisposition.parse.bind(null, ': inline; attachment; filename=foo.html'),
          /invalid type format/);
      });

      it('should reject "inline; attachment; filename=foo.html', () => {
        assert.throws(contentDisposition.parse.bind(null, 'inline; attachment; filename=foo.html'),
          /invalid parameter format/);
      });

      it('should reject "attachment; inline; filename=foo.html', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; inline; filename=foo.html'),
          /invalid parameter format/);
      });

      it('should reject "attachment; filename="foo.html".txt', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename="foo.html".txt'),
          /invalid parameter format/);
      });

      it('should reject "attachment; filename="bar', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename="bar'),
          /invalid parameter format/);
      });

      it('should reject "attachment; filename=foo"bar;baz"qux', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=foo"bar;baz"qux'),
          /invalid parameter format/);
      });

      it('should reject "attachment; filename=foo.html, attachment; filename=bar.html', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=foo.html, attachment; filename=bar.html'),
          /invalid parameter format/);
      });

      it('should reject "attachment; foo=foo filename=bar', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; foo=foo filename=bar'),
          /invalid parameter format/);
      });

      it('should reject "attachment; filename=bar foo=foo', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename=bar foo=foo'),
          /invalid parameter format/);
      });

      it('should reject "attachment filename=bar', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment filename=bar'),
          /invalid type format/);
      });

      it('should reject "filename=foo.html; attachment', () => {
        assert.throws(contentDisposition.parse.bind(null, 'filename=foo.html; attachment'),
          /invalid type format/);
      });

      it('should parse "attachment; xfilename=foo.html"', () => {
        deepEqual(contentDisposition.parse('attachment; xfilename=foo.html'), {
          type: 'attachment',
          parameters: { xfilename: 'foo.html' },
        });
      });

      it('should parse "attachment; filename="/foo.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="/foo.html"'), {
          type: 'attachment',
          parameters: { filename: '/foo.html' },
        });
      });

      it('should parse "attachment; filename="\\\\foo.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="\\\\foo.html"'), {
          type: 'attachment',
          parameters: { filename: '\\foo.html' },
        });
      });
    });

    describe('Additional Parameters', () => {
      it('should parse "attachment; creation-date="Wed, 12 Feb 1997 16:29:51 -0500""', () => {
        deepEqual(contentDisposition.parse('attachment; creation-date="Wed, 12 Feb 1997 16:29:51 -0500"'), {
          type: 'attachment',
          parameters: { 'creation-date': 'Wed, 12 Feb 1997 16:29:51 -0500' },
        });
      });

      it('should parse "attachment; modification-date="Wed, 12 Feb 1997 16:29:51 -0500""', () => {
        deepEqual(contentDisposition.parse('attachment; modification-date="Wed, 12 Feb 1997 16:29:51 -0500"'), {
          type: 'attachment',
          parameters: { 'modification-date': 'Wed, 12 Feb 1997 16:29:51 -0500' },
        });
      });
    });

    describe('Disposition-Type Extension', () => {
      it('should parse "foobar"', () => {
        deepEqual(contentDisposition.parse('foobar'), {
          type: 'foobar',
          parameters: {},
        });
      });

      it('should parse "attachment; example="filename=example.txt""', () => {
        deepEqual(contentDisposition.parse('attachment; example="filename=example.txt"'), {
          type: 'attachment',
          parameters: { example: 'filename=example.txt' },
        });
      });
    });

    describe('RFC 2231/5987 Encoding: Character Sets', () => {
      it('should parse "attachment; filename*=iso-8859-1\'\'foo-%E4.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename*=iso-8859-1\'\'foo-%E4.html'), {
          type: 'attachment',
          parameters: { filename: 'foo-ä.html' },
        });
      });

      it('should parse "attachment; filename*=UTF-8\'\'foo-%c3%a4-%e2%82%ac.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'\'foo-%c3%a4-%e2%82%ac.html'), {
          type: 'attachment',
          parameters: { filename: 'foo-ä-€.html' },
        });
      });

      it('should reject "attachment; filename*=\'\'foo-%c3%a4-%e2%82%ac.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename*=\'\'foo-%c3%a4-%e2%82%ac.html'),
          /invalid extended.*value/);
      });

      it('should parse "attachment; filename*=UTF-8\'\'foo-a%cc%88.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'\'foo-a%cc%88.html'), {
          type: 'attachment',
          parameters: { filename: 'foo-ä.html' },
        });
      });

      it('should parse "attachment; filename*=iso-8859-1\'\'foo-%c3%a4-%e2%82%ac.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename*=iso-8859-1\'\'foo-%c3%a4-%e2%82%ac.html'), {
          type: 'attachment',
          parameters: { filename: 'foo-Ã¤-â?¬.html' },
        });
      });

      it('should parse "attachment; filename*=utf-8\'\'foo-%E4.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename*=utf-8\'\'foo-%E4.html'), {
          type: 'attachment',
          parameters: { filename: 'foo-\ufffd.html' },
        });
      });

      it('should reject "attachment; filename *=UTF-8\'\'foo-%c3%a4.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename *=UTF-8\'\'foo-%c3%a4.html'),
          /invalid parameter format/);
      });

      it('should parse "attachment; filename*= UTF-8\'\'foo-%c3%a4.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename*= UTF-8\'\'foo-%c3%a4.html'), {
          type: 'attachment',
          parameters: { filename: 'foo-ä.html' },
        });
      });

      it('should parse "attachment; filename* =UTF-8\'\'foo-%c3%a4.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename* =UTF-8\'\'foo-%c3%a4.html'), {
          type: 'attachment',
          parameters: { filename: 'foo-ä.html' },
        });
      });

      it('should reject "attachment; filename*="UTF-8\'\'foo-%c3%a4.html""', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename*="UTF-8\'\'foo-%c3%a4.html"'),
          /invalid extended field value/);
      });

      it('should reject "attachment; filename*="foo%20bar.html""', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename*="foo%20bar.html"'),
          /invalid extended field value/);
      });

      it('should reject "attachment; filename*=UTF-8\'foo-%c3%a4.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename*=UTF-8\'foo-%c3%a4.html'),
          /invalid extended field value/);
      });

      it('should reject "attachment; filename*=UTF-8\'\'foo%"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename*=UTF-8\'\'foo%'),
          /invalid extended field value/);
      });

      it('should reject "attachment; filename*=UTF-8\'\'f%oo.html"', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename*=UTF-8\'\'f%oo.html'),
          /invalid extended field value/);
      });

      it('should parse "attachment; filename*=UTF-8\'\'A-%2541.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'\'A-%2541.html'), {
          type: 'attachment',
          parameters: { filename: 'A-%41.html' },
        });
      });

      it('should parse "attachment; filename*=UTF-8\'\'%5cfoo.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'\'%5cfoo.html'), {
          type: 'attachment',
          parameters: { filename: '\\foo.html' },
        });
      });
    });

    describe('RFC2231 Encoding: Continuations', () => {
      it('should parse "attachment; filename*0="foo."; filename*1="html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename*0="foo."; filename*1="html"'), {
          type: 'attachment',
          parameters: { 'filename*0': 'foo.', 'filename*1': 'html' },
        });
      });

      it('should parse "attachment; filename*0="foo"; filename*1="\\b\\a\\r.html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename*0="foo"; filename*1="\\b\\a\\r.html"'), {
          type: 'attachment',
          parameters: { 'filename*0': 'foo', 'filename*1': 'bar.html' },
        });
      });

      it('should parse "attachment; filename*0*=UTF-8\'\'foo-%c3%a4; filename*1=".html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename*0*=UTF-8\'\'foo-%c3%a4; filename*1=".html"'), {
          type: 'attachment',
          parameters: { 'filename*0*': 'UTF-8\'\'foo-%c3%a4', 'filename*1': '.html' },
        });
      });

      it('should parse "attachment; filename*0="foo"; filename*01="bar""', () => {
        deepEqual(contentDisposition.parse('attachment; filename*0="foo"; filename*01="bar"'), {
          type: 'attachment',
          parameters: { 'filename*0': 'foo', 'filename*01': 'bar' },
        });
      });

      it('should parse "attachment; filename*0="foo"; filename*2="bar""', () => {
        deepEqual(contentDisposition.parse('attachment; filename*0="foo"; filename*2="bar"'), {
          type: 'attachment',
          parameters: { 'filename*0': 'foo', 'filename*2': 'bar' },
        });
      });

      it('should parse "attachment; filename*1="foo."; filename*2="html""', () => {
        deepEqual(contentDisposition.parse('attachment; filename*1="foo."; filename*2="html"'), {
          type: 'attachment',
          parameters: { 'filename*1': 'foo.', 'filename*2': 'html' },
        });
      });

      it('should parse "attachment; filename*1="bar"; filename*0="foo""', () => {
        deepEqual(contentDisposition.parse('attachment; filename*1="bar"; filename*0="foo"'), {
          type: 'attachment',
          parameters: { 'filename*1': 'bar', 'filename*0': 'foo' },
        });
      });
    });

    describe('RFC2231 Encoding: Fallback Behaviour', () => {
      it('should parse "attachment; filename="foo-ae.html"; filename*=UTF-8\'\'foo-%c3%a4.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename="foo-ae.html"; filename*=UTF-8\'\'foo-%c3%a4.html'), {
          type: 'attachment',
          parameters: { filename: 'foo-ä.html' },
        });
      });

      it('should parse "attachment; filename*=UTF-8\'\'foo-%c3%a4.html; filename="foo-ae.html"', () => {
        deepEqual(contentDisposition.parse('attachment; filename*=UTF-8\'\'foo-%c3%a4.html; filename="foo-ae.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo-ä.html' },
        });
      });

      it('should parse "attachment; filename*0*=ISO-8859-15\'\'euro-sign%3d%a4; filename*=ISO-8859-1\'\'currency-sign%3d%a4', () => {
        deepEqual(contentDisposition.parse('attachment; filename*0*=ISO-8859-15\'\'euro-sign%3d%a4; filename*=ISO-8859-1\'\'currency-sign%3d%a4'), {
          type: 'attachment',
          parameters: { filename: 'currency-sign=¤', 'filename*0*': 'ISO-8859-15\'\'euro-sign%3d%a4' },
        });
      });

      it('should parse "attachment; foobar=x; filename="foo.html"', () => {
        deepEqual(contentDisposition.parse('attachment; foobar=x; filename="foo.html"'), {
          type: 'attachment',
          parameters: { filename: 'foo.html', foobar: 'x' },
        });
      });
    });

    describe('RFC2047 Encoding', () => {
      it('should reject "attachment; filename==?ISO-8859-1?Q?foo-=E4.html?="', () => {
        assert.throws(contentDisposition.parse.bind(null, 'attachment; filename==?ISO-8859-1?Q?foo-=E4.html?='),
          /invalid parameter format/);
      });

      it('should parse "attachment; filename="=?ISO-8859-1?Q?foo-=E4.html?=""', () => {
        deepEqual(contentDisposition.parse('attachment; filename="=?ISO-8859-1?Q?foo-=E4.html?="'), {
          type: 'attachment',
          parameters: { filename: '=?ISO-8859-1?Q?foo-=E4.html?=' },
        });
      });
    });
  });
});
