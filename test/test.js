const contentDisposition = require("..");

describe("contentDisposition.create()", () => {
  it("should create an attachment header", () => {
    expect(contentDisposition.create()).toBe("attachment");
  });
});

describe("contentDisposition.create(filename)", () => {
  it("should require a string", () => {
    expect(contentDisposition.create.bind(null, 42)).toThrow(
      /filename.*string/
    );
  });

  it("should create a header with file name", () => {
    expect(contentDisposition.create("plans.pdf")).toBe(
      'attachment; filename="plans.pdf"'
    );
  });

  it("should use the basename of the string", () => {
    expect(contentDisposition.create("/path/to/plans.pdf")).toBe(
      'attachment; filename="plans.pdf"'
    );
  });

  describe('when "filename" is US-ASCII', () => {
    it("should only include filename parameter", () => {
      expect(contentDisposition.create("plans.pdf")).toBe(
        'attachment; filename="plans.pdf"'
      );
    });

    it("should escape quotes", () => {
      expect(contentDisposition.create('the "plans".pdf')).toBe(
        'attachment; filename="the \\"plans\\".pdf"'
      );
    });
  });

  describe('when "filename" is ISO-8859-1', () => {
    it("should only include filename parameter", () => {
      expect(contentDisposition.create("«plans».pdf")).toBe(
        'attachment; filename="«plans».pdf"'
      );
    });

    it("should escape quotes", () => {
      expect(contentDisposition.create('the "plans" (1µ).pdf')).toBe(
        'attachment; filename="the \\"plans\\" (1µ).pdf"'
      );
    });
  });

  describe('when "filename" is Unicode', () => {
    it("should include filename* parameter", () => {
      expect(contentDisposition.create("планы.pdf")).toBe(
        "attachment; filename=\"?????.pdf\"; filename*=UTF-8''%D0%BF%D0%BB%D0%B0%D0%BD%D1%8B.pdf"
      );
    });

    it("should include filename fallback", () => {
      expect(contentDisposition.create("£ and € rates.pdf")).toBe(
        "attachment; filename=\"£ and ? rates.pdf\"; filename*=UTF-8''%C2%A3%20and%20%E2%82%AC%20rates.pdf"
      );
      expect(contentDisposition.create("€ rates.pdf")).toBe(
        "attachment; filename=\"? rates.pdf\"; filename*=UTF-8''%E2%82%AC%20rates.pdf"
      );
    });

    it("should encode special characters", () => {
      expect(contentDisposition.create("€'*%().pdf")).toBe(
        "attachment; filename=\"?'*%().pdf\"; filename*=UTF-8''%E2%82%AC%27%2A%25%28%29.pdf"
      );
    });
  });

  describe('when "filename" contains hex escape', () => {
    it("should include filename* parameter", () => {
      expect(contentDisposition.create("the%20plans.pdf")).toBe(
        "attachment; filename=\"the%20plans.pdf\"; filename*=UTF-8''the%2520plans.pdf"
      );
    });

    it("should handle Unicode", () => {
      expect(contentDisposition.create("€%20£.pdf")).toBe(
        "attachment; filename=\"?%20£.pdf\"; filename*=UTF-8''%E2%82%AC%2520%C2%A3.pdf"
      );
    });
  });
});

describe("contentDisposition.create(filename, options)", () => {
  describe('with "fallback" option', () => {
    it("should require a string or Boolean", () => {
      expect(
        contentDisposition.create.bind(null, "plans.pdf", { fallback: 42 })
      ).toThrow(/fallback.*string/);
    });

    it("should default to true", () => {
      expect(contentDisposition.create("€ rates.pdf")).toBe(
        "attachment; filename=\"? rates.pdf\"; filename*=UTF-8''%E2%82%AC%20rates.pdf"
      );
    });

    describe('when "false"', () => {
      it("should not generate ISO-8859-1 fallback", () => {
        expect(
          contentDisposition.create("£ and € rates.pdf", { fallback: false })
        ).toBe(
          "attachment; filename*=UTF-8''%C2%A3%20and%20%E2%82%AC%20rates.pdf"
        );
      });

      it("should keep ISO-8859-1 filename", () => {
        expect(
          contentDisposition.create("£ rates.pdf", { fallback: false })
        ).toBe('attachment; filename="£ rates.pdf"');
      });
    });

    describe('when "true"', () => {
      it("should generate ISO-8859-1 fallback", () => {
        expect(
          contentDisposition.create("£ and € rates.pdf", { fallback: true })
        ).toBe(
          "attachment; filename=\"£ and ? rates.pdf\"; filename*=UTF-8''%C2%A3%20and%20%E2%82%AC%20rates.pdf"
        );
      });

      it("should pass through ISO-8859-1 filename", () => {
        expect(
          contentDisposition.create("£ rates.pdf", { fallback: true })
        ).toBe('attachment; filename="£ rates.pdf"');
      });
    });

    describe("when a string", () => {
      it("should require an ISO-8859-1 string", () => {
        expect(
          contentDisposition.create.bind(null, "€ rates.pdf", {
            fallback: "€ rates.pdf",
          })
        ).toThrow(/fallback.*iso-8859-1/i);
      });

      it("should use as ISO-8859-1 fallback", () => {
        expect(
          contentDisposition.create("£ and € rates.pdf", {
            fallback: "£ and EURO rates.pdf",
          })
        ).toBe(
          "attachment; filename=\"£ and EURO rates.pdf\"; filename*=UTF-8''%C2%A3%20and%20%E2%82%AC%20rates.pdf"
        );
      });

      it("should use as fallback even when filename is ISO-8859-1", () => {
        expect(
          contentDisposition.create('"£ rates".pdf', {
            fallback: "£ rates.pdf",
          })
        ).toBe(
          "attachment; filename=\"£ rates.pdf\"; filename*=UTF-8''%22%C2%A3%20rates%22.pdf"
        );
      });

      it("should do nothing if equal to filename", () => {
        expect(
          contentDisposition.create("plans.pdf", { fallback: "plans.pdf" })
        ).toBe('attachment; filename="plans.pdf"');
      });

      it("should use the basename of the string", () => {
        expect(
          contentDisposition.create("€ rates.pdf", {
            fallback: "/path/to/EURO rates.pdf",
          })
        ).toBe(
          "attachment; filename=\"EURO rates.pdf\"; filename*=UTF-8''%E2%82%AC%20rates.pdf"
        );
      });

      it("should do nothing without filename option", () => {
        expect(
          contentDisposition.create(undefined, { fallback: "plans.pdf" })
        ).toBe("attachment");
      });
    });
  });

  describe('with "type" option', () => {
    it("should default to attachment", () => {
      expect(contentDisposition.create()).toBe("attachment");
    });

    it("should require a string", () => {
      expect(
        contentDisposition.create.bind(null, undefined, { type: 42 })
      ).toThrow(/invalid type/);
    });

    it("should require a valid type", () => {
      expect(
        contentDisposition.create.bind(null, undefined, {
          type: "invlaid;type",
        })
      ).toThrow(/invalid type/);
    });

    it("should create a header with inline type", () => {
      expect(contentDisposition.create(undefined, { type: "inline" })).toBe(
        "inline"
      );
    });

    it("should create a header with inline type & filename", () => {
      expect(contentDisposition.create("plans.pdf", { type: "inline" })).toBe(
        'inline; filename="plans.pdf"'
      );
    });

    it("should normalize type", () => {
      expect(contentDisposition.create(undefined, { type: "INLINE" })).toBe(
        "inline"
      );
    });
  });
});

describe("contentDisposition.parse(string)", () => {
  it("should require string", () => {
    expect(contentDisposition.parse.bind(null)).toThrow(
      /argument string.*required/
    );
  });

  it("should reject non-strings", () => {
    expect(contentDisposition.parse.bind(null, 42)).toThrow(
      /argument string.*required/
    );
  });

  describe("with only type", () => {
    it("should reject quoted value", () => {
      expect(contentDisposition.parse.bind(null, '"attachment"')).toThrow(
        /invalid type format/
      );
    });

    it("should reject trailing semicolon", () => {
      expect(contentDisposition.parse.bind(null, "attachment;")).toThrow(
        /invalid.*format/
      );
    });

    it('should parse "attachment"', () => {
      expect(contentDisposition.parse("attachment")).toEqual({
        type: "attachment",
        parameters: {},
      });
    });

    it('should parse "inline"', () => {
      expect(contentDisposition.parse("inline")).toEqual({
        type: "inline",
        parameters: {},
      });
    });

    it('should parse "form-data"', () => {
      expect(contentDisposition.parse("form-data")).toEqual({
        type: "form-data",
        parameters: {},
      });
    });

    it("should parse with trailing LWS", () => {
      expect(contentDisposition.parse("attachment \t ")).toEqual({
        type: "attachment",
        parameters: {},
      });
    });

    it("should normalize to lower-case", () => {
      expect(contentDisposition.parse("ATTACHMENT")).toEqual({
        type: "attachment",
        parameters: {},
      });
    });
  });

  describe("with parameters", () => {
    it("should reject trailing semicolon", () => {
      expect(
        contentDisposition.parse.bind(null, 'attachment; filename="rates.pdf";')
      ).toThrow(/invalid parameter format/);
    });

    it("should reject invalid parameter name", () => {
      expect(
        contentDisposition.parse.bind(null, 'attachment; filename@="rates.pdf"')
      ).toThrow(/invalid parameter format/);
    });

    it("should reject missing parameter value", () => {
      expect(
        contentDisposition.parse.bind(null, "attachment; filename=")
      ).toThrow(/invalid parameter format/);
    });

    it("should reject invalid parameter value", () => {
      expect(
        contentDisposition.parse.bind(
          null,
          "attachment; filename=trolly,trains"
        )
      ).toThrow(/invalid parameter format/);
    });

    it("should reject invalid parameters", () => {
      expect(
        contentDisposition.parse.bind(
          null,
          "attachment; filename=total/; foo=bar"
        )
      ).toThrow(/invalid parameter format/);
    });

    it("should reject duplicate parameters", () => {
      expect(
        contentDisposition.parse.bind(
          null,
          "attachment; filename=foo; filename=bar"
        )
      ).toThrow(/invalid duplicate parameter/);
    });

    it("should reject missing type", () => {
      expect(
        contentDisposition.parse.bind(null, 'filename="plans.pdf"')
      ).toThrow(/invalid type format/);
      expect(
        contentDisposition.parse.bind(null, '; filename="plans.pdf"')
      ).toThrow(/invalid type format/);
    });

    it("should lower-case parameter name", () => {
      expect(
        contentDisposition.parse('attachment; FILENAME="plans.pdf"')
      ).toEqual({
        type: "attachment",
        parameters: { filename: "plans.pdf" },
      });
    });

    it("should parse quoted parameter value", () => {
      expect(
        contentDisposition.parse('attachment; filename="plans.pdf"')
      ).toEqual({
        type: "attachment",
        parameters: { filename: "plans.pdf" },
      });
    });

    it("should parse & unescape quoted value", () => {
      expect(
        contentDisposition.parse('attachment; filename="the \\"plans\\".pdf"')
      ).toEqual({
        type: "attachment",
        parameters: { filename: 'the "plans".pdf' },
      });
    });

    it("should include all parameters", () => {
      expect(
        contentDisposition.parse('attachment; filename="plans.pdf"; foo=bar')
      ).toEqual({
        type: "attachment",
        parameters: { filename: "plans.pdf", foo: "bar" },
      });
    });

    it("should parse parameters separated with any LWS", () => {
      expect(
        contentDisposition.parse(
          'attachment;filename="plans.pdf" \t;    \t\t foo=bar'
        )
      ).toEqual({
        type: "attachment",
        parameters: { filename: "plans.pdf", foo: "bar" },
      });
    });

    it("should parse token filename", () => {
      expect(
        contentDisposition.parse("attachment; filename=plans.pdf")
      ).toEqual({
        type: "attachment",
        parameters: { filename: "plans.pdf" },
      });
    });

    it("should parse ISO-8859-1 filename", () => {
      expect(
        contentDisposition.parse('attachment; filename="£ rates.pdf"')
      ).toEqual({
        type: "attachment",
        parameters: { filename: "£ rates.pdf" },
      });
    });
  });

  describe("with extended parameters", () => {
    it("should reject quoted extended parameter value", () => {
      expect(
        contentDisposition.parse.bind(
          null,
          "attachment; filename*=\"UTF-8''%E2%82%AC%20rates.pdf\""
        )
      ).toThrow(/invalid extended.*value/);
    });

    it("should parse UTF-8 extended parameter value", () => {
      expect(
        contentDisposition.parse(
          "attachment; filename*=UTF-8''%E2%82%AC%20rates.pdf"
        )
      ).toEqual({
        type: "attachment",
        parameters: { filename: "€ rates.pdf" },
      });
    });

    it("should parse UTF-8 extended parameter value", () => {
      expect(
        contentDisposition.parse(
          "attachment; filename*=UTF-8''%E2%82%AC%20rates.pdf"
        )
      ).toEqual({
        type: "attachment",
        parameters: { filename: "€ rates.pdf" },
      });
      expect(
        contentDisposition.parse("attachment; filename*=UTF-8''%E4%20rates.pdf")
      ).toEqual({
        type: "attachment",
        parameters: { filename: "\ufffd rates.pdf" },
      });
    });

    it("should parse ISO-8859-1 extended parameter value", () => {
      expect(
        contentDisposition.parse(
          "attachment; filename*=ISO-8859-1''%A3%20rates.pdf"
        )
      ).toEqual({
        type: "attachment",
        parameters: { filename: "£ rates.pdf" },
      });
      expect(
        contentDisposition.parse(
          "attachment; filename*=ISO-8859-1''%82%20rates.pdf"
        )
      ).toEqual({
        type: "attachment",
        parameters: { filename: "? rates.pdf" },
      });
    });

    it("should not be case-sensitive for charser", () => {
      expect(
        contentDisposition.parse(
          "attachment; filename*=utf-8''%E2%82%AC%20rates.pdf"
        )
      ).toEqual({
        type: "attachment",
        parameters: { filename: "€ rates.pdf" },
      });
    });

    it("should reject unsupported charset", () => {
      expect(
        contentDisposition.parse.bind(
          null,
          "attachment; filename*=ISO-8859-2''%A4%20rates.pdf"
        )
      ).toThrow(/unsupported charset/);
    });

    it("should parse with embedded language", () => {
      expect(
        contentDisposition.parse(
          "attachment; filename*=UTF-8'en'%E2%82%AC%20rates.pdf"
        )
      ).toEqual({
        type: "attachment",
        parameters: { filename: "€ rates.pdf" },
      });
    });

    it("should prefer extended parameter value", () => {
      expect(
        contentDisposition.parse(
          "attachment; filename=\"EURO rates.pdf\"; filename*=UTF-8''%E2%82%AC%20rates.pdf"
        )
      ).toEqual({
        type: "attachment",
        parameters: { filename: "€ rates.pdf" },
      });
      expect(
        contentDisposition.parse(
          "attachment; filename*=UTF-8''%E2%82%AC%20rates.pdf; filename=\"EURO rates.pdf\""
        )
      ).toEqual({
        type: "attachment",
        parameters: { filename: "€ rates.pdf" },
      });
    });
  });

  describe("from TC 2231", () => {
    describe("Disposition-Type Inline", () => {
      it('should parse "inline"', () => {
        expect(contentDisposition.parse("inline")).toEqual({
          type: "inline",
          parameters: {},
        });
      });

      it('should reject ""inline""', () => {
        expect(contentDisposition.parse.bind(null, '"inline"')).toThrow(
          /invalid type format/
        );
      });

      it('should parse "inline; filename="foo.html""', () => {
        expect(contentDisposition.parse('inline; filename="foo.html"')).toEqual(
          {
            type: "inline",
            parameters: { filename: "foo.html" },
          }
        );
      });

      it('should parse "inline; filename="Not an attachment!""', () => {
        expect(
          contentDisposition.parse('inline; filename="Not an attachment!"')
        ).toEqual({
          type: "inline",
          parameters: { filename: "Not an attachment!" },
        });
      });

      it('should parse "inline; filename="foo.pdf""', () => {
        expect(contentDisposition.parse('inline; filename="foo.pdf"')).toEqual({
          type: "inline",
          parameters: { filename: "foo.pdf" },
        });
      });
    });

    describe("Disposition-Type Attachment", () => {
      it('should parse "attachment"', () => {
        expect(contentDisposition.parse("attachment")).toEqual({
          type: "attachment",
          parameters: {},
        });
      });

      it('should reject ""attachment""', () => {
        expect(contentDisposition.parse.bind(null, '"attachment"')).toThrow(
          /invalid type format/
        );
      });

      it('should parse "ATTACHMENT"', () => {
        expect(contentDisposition.parse("ATTACHMENT")).toEqual({
          type: "attachment",
          parameters: {},
        });
      });

      it('should parse "attachment; filename="foo.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="foo.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html" },
        });
      });

      it('should parse "attachment; filename="0000000000111111111122222""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename="0000000000111111111122222"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "0000000000111111111122222" },
        });
      });

      it('should parse "attachment; filename="00000000001111111111222222222233333""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename="00000000001111111111222222222233333"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "00000000001111111111222222222233333" },
        });
      });

      it('should parse "attachment; filename="f\\oo.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="f\\oo.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html" },
        });
      });

      it('should parse "attachment; filename="\\"quoting\\" tested.html""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename="\\"quoting\\" tested.html"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: '"quoting" tested.html' },
        });
      });

      it('should parse "attachment; filename="Here\'s a semicolon;.html""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename="Here\'s a semicolon;.html"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "Here's a semicolon;.html" },
        });
      });

      it('should parse "attachment; foo="bar"; filename="foo.html""', () => {
        expect(
          contentDisposition.parse('attachment; foo="bar"; filename="foo.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html", foo: "bar" },
        });
      });

      it('should parse "attachment; foo="\\"\\\\";filename="foo.html""', () => {
        expect(
          contentDisposition.parse(
            'attachment; foo="\\"\\\\";filename="foo.html"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html", foo: '"\\' },
        });
      });

      it('should parse "attachment; FILENAME="foo.html""', () => {
        expect(
          contentDisposition.parse('attachment; FILENAME="foo.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html" },
        });
      });

      it('should parse "attachment; filename=foo.html"', () => {
        expect(
          contentDisposition.parse("attachment; filename=foo.html")
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html" },
        });
      });

      it('should reject "attachment; filename=foo,bar.html"', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename=foo,bar.html"
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; filename=foo.html ;"', () => {
        expect(
          contentDisposition.parse.bind(null, "attachment; filename=foo.html ;")
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; ;filename=foo"', () => {
        expect(
          contentDisposition.parse.bind(null, "attachment; ;filename=foo")
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; filename=foo bar.html"', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename=foo bar.html"
          )
        ).toThrow(/invalid parameter format/);
      });

      it("should parse \"attachment; filename='foo.bar'", () => {
        expect(
          contentDisposition.parse("attachment; filename='foo.bar'")
        ).toEqual({
          type: "attachment",
          parameters: { filename: "'foo.bar'" },
        });
      });

      it('should parse "attachment; filename="foo-ä.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="foo-ä.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-ä.html" },
        });
      });

      it('should parse "attachment; filename="foo-Ã¤.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="foo-Ã¤.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-Ã¤.html" },
        });
      });

      it('should parse "attachment; filename="foo-%41.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="foo-%41.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-%41.html" },
        });
      });

      it('should parse "attachment; filename="50%.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="50%.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "50%.html" },
        });
      });

      it('should parse "attachment; filename="foo-%\\41.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="foo-%\\41.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-%41.html" },
        });
      });

      it('should parse "attachment; name="foo-%41.html""', () => {
        expect(
          contentDisposition.parse('attachment; name="foo-%41.html"')
        ).toEqual({
          type: "attachment",
          parameters: { name: "foo-%41.html" },
        });
      });

      it('should parse "attachment; filename="ä-%41.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="ä-%41.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "ä-%41.html" },
        });
      });

      it('should parse "attachment; filename="foo-%c3%a4-%e2%82%ac.html""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename="foo-%c3%a4-%e2%82%ac.html"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-%c3%a4-%e2%82%ac.html" },
        });
      });

      it('should parse "attachment; filename ="foo.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename ="foo.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html" },
        });
      });

      it('should reject "attachment; filename="foo.html"; filename="bar.html"', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            'attachment; filename="foo.html"; filename="bar.html"'
          )
        ).toThrow(/invalid duplicate parameter/);
      });

      it('should reject "attachment; filename=foo[1](2).html"', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename=foo[1](2).html"
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; filename=foo-ä.html"', () => {
        expect(
          contentDisposition.parse.bind(null, "attachment; filename=foo-ä.html")
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; filename=foo-Ã¤.html"', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename=foo-Ã¤.html"
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "filename=foo.html"', () => {
        expect(
          contentDisposition.parse.bind(null, "filename=foo.html")
        ).toThrow(/invalid type format/);
      });

      it('should reject "x=y; filename=foo.html"', () => {
        expect(
          contentDisposition.parse.bind(null, "x=y; filename=foo.html")
        ).toThrow(/invalid type format/);
      });

      it('should reject ""foo; filename=bar;baz"; filename=qux"', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            '"foo; filename=bar;baz"; filename=qux'
          )
        ).toThrow(/invalid type format/);
      });

      it('should reject "filename=foo.html, filename=bar.html"', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "filename=foo.html, filename=bar.html"
          )
        ).toThrow(/invalid type format/);
      });

      it('should reject "; filename=foo.html"', () => {
        expect(
          contentDisposition.parse.bind(null, "; filename=foo.html")
        ).toThrow(/invalid type format/);
      });

      it('should reject ": inline; attachment; filename=foo.html', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            ": inline; attachment; filename=foo.html"
          )
        ).toThrow(/invalid type format/);
      });

      it('should reject "inline; attachment; filename=foo.html', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "inline; attachment; filename=foo.html"
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; inline; filename=foo.html', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; inline; filename=foo.html"
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; filename="foo.html".txt', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            'attachment; filename="foo.html".txt'
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; filename="bar', () => {
        expect(
          contentDisposition.parse.bind(null, 'attachment; filename="bar')
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; filename=foo"bar;baz"qux', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            'attachment; filename=foo"bar;baz"qux'
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; filename=foo.html, attachment; filename=bar.html', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename=foo.html, attachment; filename=bar.html"
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; foo=foo filename=bar', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; foo=foo filename=bar"
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment; filename=bar foo=foo', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename=bar foo=foo"
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should reject "attachment filename=bar', () => {
        expect(
          contentDisposition.parse.bind(null, "attachment filename=bar")
        ).toThrow(/invalid type format/);
      });

      it('should reject "filename=foo.html; attachment', () => {
        expect(
          contentDisposition.parse.bind(null, "filename=foo.html; attachment")
        ).toThrow(/invalid type format/);
      });

      it('should parse "attachment; xfilename=foo.html"', () => {
        expect(
          contentDisposition.parse("attachment; xfilename=foo.html")
        ).toEqual({
          type: "attachment",
          parameters: { xfilename: "foo.html" },
        });
      });

      it('should parse "attachment; filename="/foo.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="/foo.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "/foo.html" },
        });
      });

      it('should parse "attachment; filename="\\\\foo.html""', () => {
        expect(
          contentDisposition.parse('attachment; filename="\\\\foo.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "\\foo.html" },
        });
      });
    });

    describe("Additional Parameters", () => {
      it('should parse "attachment; creation-date="Wed, 12 Feb 1997 16:29:51 -0500""', () => {
        expect(
          contentDisposition.parse(
            'attachment; creation-date="Wed, 12 Feb 1997 16:29:51 -0500"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { "creation-date": "Wed, 12 Feb 1997 16:29:51 -0500" },
        });
      });

      it('should parse "attachment; modification-date="Wed, 12 Feb 1997 16:29:51 -0500""', () => {
        expect(
          contentDisposition.parse(
            'attachment; modification-date="Wed, 12 Feb 1997 16:29:51 -0500"'
          )
        ).toEqual({
          type: "attachment",
          parameters: {
            "modification-date": "Wed, 12 Feb 1997 16:29:51 -0500",
          },
        });
      });
    });

    describe("Disposition-Type Extension", () => {
      it('should parse "foobar"', () => {
        expect(contentDisposition.parse("foobar")).toEqual({
          type: "foobar",
          parameters: {},
        });
      });

      it('should parse "attachment; example="filename=example.txt""', () => {
        expect(
          contentDisposition.parse('attachment; example="filename=example.txt"')
        ).toEqual({
          type: "attachment",
          parameters: { example: "filename=example.txt" },
        });
      });
    });

    describe("RFC 2231/5987 Encoding: Character Sets", () => {
      it("should parse \"attachment; filename*=iso-8859-1''foo-%E4.html\"", () => {
        expect(
          contentDisposition.parse(
            "attachment; filename*=iso-8859-1''foo-%E4.html"
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-ä.html" },
        });
      });

      it("should parse \"attachment; filename*=UTF-8''foo-%c3%a4-%e2%82%ac.html\"", () => {
        expect(
          contentDisposition.parse(
            "attachment; filename*=UTF-8''foo-%c3%a4-%e2%82%ac.html"
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-ä-€.html" },
        });
      });

      it("should reject \"attachment; filename*=''foo-%c3%a4-%e2%82%ac.html\"", () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename*=''foo-%c3%a4-%e2%82%ac.html"
          )
        ).toThrow(/invalid extended.*value/);
      });

      it("should parse \"attachment; filename*=UTF-8''foo-a%cc%88.html\"", () => {
        expect(
          contentDisposition.parse(
            "attachment; filename*=UTF-8''foo-a%cc%88.html"
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-ä.html" },
        });
      });

      it("should parse \"attachment; filename*=iso-8859-1''foo-%c3%a4-%e2%82%ac.html\"", () => {
        expect(
          contentDisposition.parse(
            "attachment; filename*=iso-8859-1''foo-%c3%a4-%e2%82%ac.html"
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-Ã¤-â?¬.html" },
        });
      });

      it("should parse \"attachment; filename*=utf-8''foo-%E4.html\"", () => {
        expect(
          contentDisposition.parse("attachment; filename*=utf-8''foo-%E4.html")
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-\ufffd.html" },
        });
      });

      it("should reject \"attachment; filename *=UTF-8''foo-%c3%a4.html\"", () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename *=UTF-8''foo-%c3%a4.html"
          )
        ).toThrow(/invalid parameter format/);
      });

      it("should parse \"attachment; filename*= UTF-8''foo-%c3%a4.html\"", () => {
        expect(
          contentDisposition.parse(
            "attachment; filename*= UTF-8''foo-%c3%a4.html"
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-ä.html" },
        });
      });

      it("should parse \"attachment; filename* =UTF-8''foo-%c3%a4.html\"", () => {
        expect(
          contentDisposition.parse(
            "attachment; filename* =UTF-8''foo-%c3%a4.html"
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-ä.html" },
        });
      });

      it('should reject "attachment; filename*="UTF-8\'\'foo-%c3%a4.html""', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename*=\"UTF-8''foo-%c3%a4.html\""
          )
        ).toThrow(/invalid extended field value/);
      });

      it('should reject "attachment; filename*="foo%20bar.html""', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            'attachment; filename*="foo%20bar.html"'
          )
        ).toThrow(/invalid extended field value/);
      });

      it('should reject "attachment; filename*=UTF-8\'foo-%c3%a4.html"', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename*=UTF-8'foo-%c3%a4.html"
          )
        ).toThrow(/invalid extended field value/);
      });

      it("should reject \"attachment; filename*=UTF-8''foo%\"", () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename*=UTF-8''foo%"
          )
        ).toThrow(/invalid extended field value/);
      });

      it("should reject \"attachment; filename*=UTF-8''f%oo.html\"", () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename*=UTF-8''f%oo.html"
          )
        ).toThrow(/invalid extended field value/);
      });

      it("should parse \"attachment; filename*=UTF-8''A-%2541.html\"", () => {
        expect(
          contentDisposition.parse("attachment; filename*=UTF-8''A-%2541.html")
        ).toEqual({
          type: "attachment",
          parameters: { filename: "A-%41.html" },
        });
      });

      it("should parse \"attachment; filename*=UTF-8''%5cfoo.html\"", () => {
        expect(
          contentDisposition.parse("attachment; filename*=UTF-8''%5cfoo.html")
        ).toEqual({
          type: "attachment",
          parameters: { filename: "\\foo.html" },
        });
      });
    });

    describe("RFC2231 Encoding: Continuations", () => {
      it('should parse "attachment; filename*0="foo."; filename*1="html""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename*0="foo."; filename*1="html"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { "filename*0": "foo.", "filename*1": "html" },
        });
      });

      it('should parse "attachment; filename*0="foo"; filename*1="\\b\\a\\r.html""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename*0="foo"; filename*1="\\b\\a\\r.html"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { "filename*0": "foo", "filename*1": "bar.html" },
        });
      });

      it('should parse "attachment; filename*0*=UTF-8\'\'foo-%c3%a4; filename*1=".html""', () => {
        expect(
          contentDisposition.parse(
            "attachment; filename*0*=UTF-8''foo-%c3%a4; filename*1=\".html\""
          )
        ).toEqual({
          type: "attachment",
          parameters: {
            "filename*0*": "UTF-8''foo-%c3%a4",
            "filename*1": ".html",
          },
        });
      });

      it('should parse "attachment; filename*0="foo"; filename*01="bar""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename*0="foo"; filename*01="bar"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { "filename*0": "foo", "filename*01": "bar" },
        });
      });

      it('should parse "attachment; filename*0="foo"; filename*2="bar""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename*0="foo"; filename*2="bar"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { "filename*0": "foo", "filename*2": "bar" },
        });
      });

      it('should parse "attachment; filename*1="foo."; filename*2="html""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename*1="foo."; filename*2="html"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { "filename*1": "foo.", "filename*2": "html" },
        });
      });

      it('should parse "attachment; filename*1="bar"; filename*0="foo""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename*1="bar"; filename*0="foo"'
          )
        ).toEqual({
          type: "attachment",
          parameters: { "filename*1": "bar", "filename*0": "foo" },
        });
      });
    });

    describe("RFC2231 Encoding: Fallback Behaviour", () => {
      it('should parse "attachment; filename="foo-ae.html"; filename*=UTF-8\'\'foo-%c3%a4.html"', () => {
        expect(
          contentDisposition.parse(
            "attachment; filename=\"foo-ae.html\"; filename*=UTF-8''foo-%c3%a4.html"
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-ä.html" },
        });
      });

      it('should parse "attachment; filename*=UTF-8\'\'foo-%c3%a4.html; filename="foo-ae.html"', () => {
        expect(
          contentDisposition.parse(
            "attachment; filename*=UTF-8''foo-%c3%a4.html; filename=\"foo-ae.html\""
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo-ä.html" },
        });
      });

      it("should parse \"attachment; filename*0*=ISO-8859-15''euro-sign%3d%a4; filename*=ISO-8859-1''currency-sign%3d%a4", () => {
        expect(
          contentDisposition.parse(
            "attachment; filename*0*=ISO-8859-15''euro-sign%3d%a4; filename*=ISO-8859-1''currency-sign%3d%a4"
          )
        ).toEqual({
          type: "attachment",
          parameters: {
            filename: "currency-sign=¤",
            "filename*0*": "ISO-8859-15''euro-sign%3d%a4",
          },
        });
      });

      it('should parse "attachment; foobar=x; filename="foo.html"', () => {
        expect(
          contentDisposition.parse('attachment; foobar=x; filename="foo.html"')
        ).toEqual({
          type: "attachment",
          parameters: { filename: "foo.html", foobar: "x" },
        });
      });
    });

    describe("RFC2047 Encoding", () => {
      it('should reject "attachment; filename==?ISO-8859-1?Q?foo-=E4.html?="', () => {
        expect(
          contentDisposition.parse.bind(
            null,
            "attachment; filename==?ISO-8859-1?Q?foo-=E4.html?="
          )
        ).toThrow(/invalid parameter format/);
      });

      it('should parse "attachment; filename="=?ISO-8859-1?Q?foo-=E4.html?=""', () => {
        expect(
          contentDisposition.parse(
            'attachment; filename="=?ISO-8859-1?Q?foo-=E4.html?="'
          )
        ).toEqual({
          type: "attachment",
          parameters: { filename: "=?ISO-8859-1?Q?foo-=E4.html?=" },
        });
      });
    });
  });
});
