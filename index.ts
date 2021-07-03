/*!
 * content-disposition
 * Copyright(c) 2014-2017 Douglas Christopher Wilson
 * MIT Licensed
 */

import { basename } from "path";
import { Buffer } from "buffer";

/**
 * RegExp to match non attr-char, *after* encodeURIComponent (i.e. not including "%")
 * @private
 */

const ENCODE_URL_ATTR_CHAR_REGEXP = /[\x00-\x20"'()*,/:;<=>?@[\\\]{}\x7f]/g; // eslint-disable-line no-control-regex

/**
 * RegExp to match percent encoding escape.
 * @private
 */

const HEX_ESCAPE_REGEXP = /%[0-9A-Fa-f]{2}/;
const HEX_ESCAPE_REPLACE_REGEXP = /%([0-9A-Fa-f]{2})/g;

/**
 * RegExp to match non-latin1 characters.
 * @private
 */

const NON_LATIN1_REGEXP = /[^\x20-\x7e\xa0-\xff]/g;

/**
 * RegExp to match quoted-pair in RFC 2616
 *
 * quoted-pair = "\" CHAR
 * CHAR        = <any US-ASCII character (octets 0 - 127)>
 * @private
 */

const QESC_REGEXP = /\\([\u0000-\u007f])/g; // eslint-disable-line no-control-regex

/**
 * RegExp to match chars that must be quoted-pair in RFC 2616
 * @private
 */

const QUOTE_REGEXP = /([\\"])/g;

/**
 * RegExp for various RFC 2616 grammar
 *
 * parameter     = token "=" ( token | quoted-string )
 * token         = 1*<any CHAR except CTLs or separators>
 * separators    = "(" | ")" | "<" | ">" | "@"
 *               | "," | ";" | ":" | "\" | <">
 *               | "/" | "[" | "]" | "?" | "="
 *               | "{" | "}" | SP | HT
 * quoted-string = ( <"> *(qdtext | quoted-pair ) <"> )
 * qdtext        = <any TEXT except <">>
 * quoted-pair   = "\" CHAR
 * CHAR          = <any US-ASCII character (octets 0 - 127)>
 * TEXT          = <any OCTET except CTLs, but including LWS>
 * LWS           = [CRLF] 1*( SP | HT )
 * CRLF          = CR LF
 * CR            = <US-ASCII CR, carriage return (13)>
 * LF            = <US-ASCII LF, linefeed (10)>
 * SP            = <US-ASCII SP, space (32)>
 * HT            = <US-ASCII HT, horizontal-tab (9)>
 * CTL           = <any US-ASCII control character (octets 0 - 31) and DEL (127)>
 * OCTET         = <any 8-bit sequence of data>
 * @private
 */

const PARAM_REGEXP =
  /;[\x09\x20]*([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*=[\x09\x20]*("(?:[\x20!\x23-\x5b\x5d-\x7e\x80-\xff]|\\[\x20-\x7e])*"|[!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*/g; // eslint-disable-line no-control-regex
const TEXT_REGEXP = /^[\x20-\x7e\x80-\xff]+$/;
const TOKEN_REGEXP = /^[!#$%&'*+.0-9A-Z^_`a-z|~-]+$/;

/**
 * RegExp for various RFC 5987 grammar
 *
 * ext-value     = charset  "'" [ language ] "'" value-chars
 * charset       = "UTF-8" / "ISO-8859-1" / mime-charset
 * mime-charset  = 1*mime-charsetc
 * mime-charsetc = ALPHA / DIGIT
 *               / "!" / "#" / "$" / "%" / "&"
 *               / "+" / "-" / "^" / "_" / "`"
 *               / "{" / "}" / "~"
 * language      = ( 2*3ALPHA [ extlang ] )
 *               / 4ALPHA
 *               / 5*8ALPHA
 * extlang       = *3( "-" 3ALPHA )
 * value-chars   = *( pct-encoded / attr-char )
 * pct-encoded   = "%" HEXDIG HEXDIG
 * attr-char     = ALPHA / DIGIT
 *               / "!" / "#" / "$" / "&" / "+" / "-" / "."
 *               / "^" / "_" / "`" / "|" / "~"
 * @private
 */

const EXT_VALUE_REGEXP =
  /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}){0,3}|[A-Za-z]{4,8}|)'((?:%[0-9A-Fa-f]{2}|[A-Za-z0-9!#$&+.^_`|~-])+)$/;

/**
 * RegExp for various RFC 6266 grammar
 *
 * disposition-type = "inline" | "attachment" | disp-ext-type
 * disp-ext-type    = token
 * disposition-parm = filename-parm | disp-ext-parm
 * filename-parm    = "filename" "=" value
 *                  | "filename*" "=" ext-value
 * disp-ext-parm    = token "=" value
 *                  | ext-token "=" ext-value
 * ext-token        = <the characters in token, followed by "*">
 * @private
 */

const DISPOSITION_TYPE_REGEXP =
  /^([!#$%&'*+.0-9A-Z^_`a-z|~-]+)[\x09\x20]*(?:$|;)/; // eslint-disable-line no-control-regex

interface Options {
  readonly type?: string;
  readonly fallback?: string | boolean;
}

/**
 * Create an attachment Content-Disposition header.
 *
 * @param {string} [filename]
 * @param {object} [options]
 * @param {string} [options.type=attachment]
 * @param {string|boolean} [options.fallback=true]
 * @return {string}
 * @public
 */

export function create(filename: string, options?: Options): string {
  const opts = options || {};

  // get type
  const type = opts.type || "attachment";

  // get parameters
  const params = createparams(filename, opts.fallback);

  // format into string
  return format({ type, parameters: params });
}

interface Parameters {
  'filename*'?: string;
  filename?: string;
}

/**
 * Create parameters object from filename and fallback.
 *
 * @param {string} [filename]
 * @param {string|boolean} [fallback=true]
 * @return {object}
 * @private
 */

function createparams(filename: string, fallback: string | boolean | undefined) {
  if (filename === undefined) {
    return;
  }

  const params: Parameters = {};

  if (typeof filename !== "string") {
    throw new TypeError("filename must be a string");
  }

  // fallback defaults to true
  if (fallback === undefined) {
    fallback = true;
  }

  if (typeof fallback !== "string" && typeof fallback !== "boolean") {
    throw new TypeError("fallback must be a string or boolean");
  }

  if (typeof fallback === "string" && NON_LATIN1_REGEXP.test(fallback)) {
    throw new TypeError("fallback must be ISO-8859-1 string");
  }

  // restrict to file base name
  const name = basename(filename);

  // determine if name is suitable for quoted string
  const isQuotedString = TEXT_REGEXP.test(name);

  // generate fallback name
  const fallbackName =
    typeof fallback !== "string"
      ? fallback && getlatin1(name)
      : basename(fallback);
  const hasFallback = typeof fallbackName === "string" && fallbackName !== name;

  // set extended filename parameter
  if (hasFallback || !isQuotedString || HEX_ESCAPE_REGEXP.test(name)) {
    params["filename*"] = name;
  }

  // set filename parameter
  if (isQuotedString || hasFallback) {
    params.filename = hasFallback ? fallbackName as string : name;
  }

  return params;
}

interface ContentDisposition {
  readonly parameters: Parameters | undefined;
  readonly type: string;
}

/**
 * Format object to Content-Disposition header.
 *
 * @param {object} obj
 * @param {string} obj.type
 * @param {object} [obj.parameters]
 * @return {string}
 * @private
 */

function format(obj: ContentDisposition) {
  const { parameters } = obj;
  const { type } = obj;

  if (!type || typeof type !== "string" || !TOKEN_REGEXP.test(type)) {
    throw new TypeError("invalid type");
  }

  // start with normalized type
  let string = String(type).toLowerCase();

  // append parameters
  if (parameters && typeof parameters === "object") {
    let param;
    const params: readonly (keyof Parameters)[] = (Object.keys(parameters) as (keyof Parameters)[]).sort();

    for (let i = 0; i < params.length; i++) {
      param = params[i];

      const val =
        param.substr(-1) === "*"
          ? ustring(parameters[param])
          : qstring(parameters[param]);

      string += `; ${param}=${val}`;
    }
  }

  return string;
}

/**
 * Decode a RFC 5987 field value (gracefully).
 *
 * @param {string} str
 * @return {string}
 * @private
 */

function decodefield(str: string) {
  const match = EXT_VALUE_REGEXP.exec(str);

  if (!match) {
    throw new TypeError("invalid extended field value");
  }

  const charset = match[1].toLowerCase();
  const encoded = match[2];
  let value;

  // to binary string
  const binary = encoded.replace(HEX_ESCAPE_REPLACE_REGEXP, pdecode);

  switch (charset) {
    case "iso-8859-1":
      value = getlatin1(binary);
      break;
    case "utf-8":
      value = Buffer.from(binary, "binary").toString("utf8");
      break;
    default:
      throw new TypeError("unsupported charset in extended field");
  }

  return value;
}

/**
 * Get ISO-8859-1 version of string.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function getlatin1(val: string) {
  // simple Unicode -> ISO-8859-1 transformation
  return String(val).replace(NON_LATIN1_REGEXP, "?");
}

/**
 * Parse Content-Disposition header string.
 *
 * @param {string} string
 * @return {object}
 * @public
 */

export function parse(string: string): ContentDisposition {
  if (!string || typeof string !== "string") {
    throw new TypeError("argument string is required");
  }

  let match = DISPOSITION_TYPE_REGEXP.exec(string);

  if (!match) {
    throw new TypeError("invalid type format");
  }

  // normalize type
  let index = match[0].length;
  const type = match[1].toLowerCase();

  let key;
  const names = [];
  const params: Parameters = {};
  let value;

  // calculate index to start at
  index = PARAM_REGEXP.lastIndex =
    match[0].substr(-1) === ";" ? index - 1 : index;

  // match parameters
  while ((match = PARAM_REGEXP.exec(string))) {
    if (match.index !== index) {
      throw new TypeError("invalid parameter format");
    }

    index += match[0].length;
    key = match[1].toLowerCase();
    value = match[2];

    if (names.indexOf(key) !== -1) {
      throw new TypeError("invalid duplicate parameter");
    }

    names.push(key);

    if (key.indexOf("*") + 1 === key.length) {
      // decode extended value
      key = key.slice(0, -1);
      value = decodefield(value);

      // overwrite existing value
      params[key as keyof Parameters] = value;
      continue;
    }

    if (typeof params[key as keyof Parameters] === "string") {
      continue;
    }

    if (value[0] === '"') {
      // remove quotes and escapes
      value = value.substr(1, value.length - 2).replace(QESC_REGEXP, "$1");
    }

    params[key as keyof Parameters] = value;
  }

  if (index !== -1 && index !== string.length) {
    throw new TypeError("invalid parameter format");
  }

  return { type, parameters: params };
}

/**
 * Percent decode a single character.
 *
 * @param {string} str
 * @param {string} hex
 * @return {string}
 * @private
 */

function pdecode(str: string, hex: string) {
  return String.fromCharCode(parseInt(hex, 16));
}

/**
 * Percent encode a single character.
 *
 * @param {string} char
 * @return {string}
 * @private
 */

function pencode(char: string) {
  return `%${String(char).charCodeAt(0).toString(16).toUpperCase()}`;
}

/**
 * Quote a string for HTTP.
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function qstring(val: string | undefined) {
  const str = String(val);

  return `"${str.replace(QUOTE_REGEXP, "\\$1")}"`;
}

/**
 * Encode a Unicode string for HTTP (RFC 5987).
 *
 * @param {string} val
 * @return {string}
 * @private
 */

function ustring(val: string | undefined) {
  const str = String(val);

  // percent encode as UTF-8
  const encoded = encodeURIComponent(str).replace(
    ENCODE_URL_ATTR_CHAR_REGEXP,
    pencode
  );

  return `UTF-8''${encoded}`;
}
