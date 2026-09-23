var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = (arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
};

// node_modules/hono/dist/utils/body.js
var MAX_NESTING_DEPTH = 32;
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = (request) => "headers" in request;
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value2, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value2;
    } else {
      handleParsingAllValues(form, key, value2);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value2]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value2, nestingState);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value2) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value2);
    } else {
      form[key] = [form[key], value2];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value2;
    } else {
      form[key] = [value2];
    }
  }
};
var handleParsingNestedValues = (form, key, value2, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".", MAX_NESTING_DEPTH + 2);
  if (keys.length > MAX_NESTING_DEPTH + 1) {
    throwNestingLimitExceeded();
  }
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value2;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) {
          throwNestingLimitExceeded();
        }
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};
var throwNestingLimitExceeded = () => {
  throw new Error("Nesting limit exceeded");
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var tryDecodeURIComponent = (str) => str.indexOf("%") !== -1 ? tryDecode(str, decodeURIComponent_) : str;
var _decodeURI = (value2) => {
  if (value2.indexOf("+") !== -1) {
    value2 = value2.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value2);
};
var _getQueryParam = (url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) {
    url = url.slice(0, hashIndex);
  }
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value2;
    if (valueIndex === -1) {
      value2 = "";
    } else {
      value2 = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value2 = _decodeURI(value2);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value2);
    } else {
      results[name] ??= value2;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value2 = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value2 !== void 0) {
        decoded[key] = tryDecodeURIComponent(value2);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value2, key) => {
      headerData[key] = value2;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        const contentType = anyCachedKey === "formData" ? void 0 : raw2.headers.get("content-type");
        return new Response(body, {
          headers: contentType ? { "Content-Type": contentType } : void 0
        })[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value2, callbacks) => {
  const escapedString = new String(value2);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value2, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value2 === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value2);
    } else {
      headers.set(name, value2);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value2) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value2);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value2] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value2);
        } else {
          responseHeaders.set(key, value2);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibytes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(methodName, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) {
            this.#addRoute(methodName, this.#path, handler);
          }
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/utils.js
var createNullObject = () => /* @__PURE__ */ Object.create(null);

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    `^${path.replace(
      /\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g,
      (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ONLY_WILDCARD_REG_EXP_STR : `/:${LABEL_REG_EXP_STR}`
    )}$`
  );
}
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: createNullObject() };
    this.#routes = { [METHOD_NAME_ALL]: createNullObject() };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap[METHOD_NAME_ALL]) {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") {
      path = "*";
    }
    const methods = method === METHOD_NAME_ALL ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) {
        if (!middleware[m][path]) {
          this.#insertPath(m, path);
          middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        }
      }
      for (const handlerMap of [middleware, routes]) {
        for (const m of methods) {
          for (const p in handlerMap[m]) {
            re.test(p) && handlerMap[m][p].push([handler, path]);
          }
        }
      }
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) {
      for (const m of methods) {
        if (!routes[m][path2]) {
          this.#insertPath(m, path2);
          routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
        }
        routes[m][path2].push([handler, path2]);
      }
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) {
      matchers[method] = this.#buildMatcher(method);
    }
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) {
      for (const path in r) {
        const handlers = r[path];
        const pathData = trie.paths[path];
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
          continue;
        }
        handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [
          h,
          trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
            map[key] = paramReplacementMap[pathData[1][i][1]];
            return map;
          }, createNullObject())
        ]);
      }
    }
    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node2 = class _Node2 {
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts2 = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts2) {
      const nextP = parts2[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new _Node2();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) {
        possibleKeys.add(pattern[1]);
      }
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order
      }
    });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts2 = splitPath(path);
    const curNodesQueue = [];
    const len = parts2.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts2[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) {
            continue;
          }
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts2[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node = new Node2();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) {
      this.#node.insert(method, result, handler);
    }
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "QUERY"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const exposeHeadersStr = opts.exposeHeaders?.length ? opts.exposeHeaders.join(",") : void 0;
  const allowHeadersStr = opts.allowHeaders?.length ? opts.allowHeaders.join(",") : void 0;
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return async (origin, c) => (await optsAllowMethods(origin, c)).join(",");
    } else if (Array.isArray(optsAllowMethods)) {
      const methodsStr = optsAllowMethods.join(",");
      return () => methodsStr;
    } else {
      return () => "";
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value2) {
      c.res.headers.set(key, value2);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (exposeHeadersStr) {
      set("Access-Control-Expose-Headers", exposeHeadersStr);
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        c.res.headers.append("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods) {
        set("Access-Control-Allow-Methods", allowMethods);
      }
      let headersStr = allowHeadersStr;
      if (!headersStr) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headersStr = requestHeaders.split(",").map((h) => h.trim()).join(",");
        }
      }
      if (headersStr) {
        set("Access-Control-Allow-Headers", headersStr);
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// server/native/bootstrap.ts
var statements = [{ "sql": `CREATE TABLE IF NOT EXISTS "app_config" (
  "app_name" TEXT DEFAULT 'BarbeiroPro AI',
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "super_admin_emails" TEXT DEFAULT '[]',
  "system_settings" TEXT DEFAULT '{}',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": `CREATE TABLE IF NOT EXISTS "appointment" (
  "company_id" TEXT,
  "completed_at" TEXT,
  "confirm_token" TEXT DEFAULT (lower(hex(randomblob(24)))),
  "confirmed_at" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "customer_id" TEXT,
  "customer_name" TEXT,
  "customer_phone" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "notes" TEXT,
  "price" REAL,
  "professional_id" TEXT,
  "professional_name" TEXT,
  "scheduled_at" TEXT,
  "service_id" TEXT,
  "service_name" TEXT,
  "source" TEXT DEFAULT 'interno',
  "status" TEXT DEFAULT 'agendado',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_appointment_company_id ON "appointment"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "billing_event_log" (
  "buyer_email" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "error" TEXT,
  "event_type" TEXT,
  "external_id" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "matched_company_id" TEXT,
  "payload" TEXT DEFAULT '{}',
  "processed" BOOLEAN DEFAULT 0,
  "provider" TEXT
);` }, { "sql": `CREATE TABLE IF NOT EXISTS "club_member" (
  "club_plan_id" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "current_period_end" TEXT,
  "customer_id" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "started_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "status" TEXT DEFAULT 'ativo',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_club_member_company_id ON "club_member"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "club_plan" (
  "ativo" BOOLEAN DEFAULT 1,
  "beneficios" TEXT DEFAULT '[]',
  "checkout_url" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "nome" TEXT,
  "preco_cents" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_club_plan_company_id ON "club_plan"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "company" (
  "business_hours" TEXT DEFAULT '{}',
  "ciclo" TEXT DEFAULT 'mensal',
  "cnpj" TEXT,
  "cpf_responsavel" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "created_by" TEXT,
  "email_contato" TEXT,
  "endereco" TEXT DEFAULT '{}',
  "fidelidade_ativa" BOOLEAN DEFAULT 0,
  "fidelidade_meta" REAL DEFAULT 10,
  "fidelidade_premio" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "logo_url" TEXT,
  "name" TEXT,
  "nome_fantasia" TEXT,
  "onboarding_concluido" BOOLEAN DEFAULT 0,
  "onboarding_step" REAL DEFAULT 0,
  "plano" TEXT DEFAULT 'starter',
  "primary_color" TEXT DEFAULT '#1B3A4B',
  "proximo_vencimento" TEXT,
  "razao_social" TEXT,
  "selected_plan_slug" TEXT,
  "slug" TEXT,
  "status_cobranca" TEXT DEFAULT 'trial',
  "telefone_comercial" TEXT,
  "trial_ate" TEXT DEFAULT (date('now','+14 days')),
  "ultimo_acesso_at" TEXT,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "valor_mensal" REAL DEFAULT 39,
  "whatsapp" TEXT
);` }, { "sql": `CREATE TABLE IF NOT EXISTS "company_user" (
  "ativo" BOOLEAN DEFAULT 1,
  "company_id" TEXT,
  "convite_aceito" BOOLEAN DEFAULT 0,
  "convite_token" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "email" TEXT,
  "forcar_troca_senha" BOOLEAN DEFAULT 0,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "nome" TEXT,
  "role" TEXT DEFAULT 'recepcao',
  "ultimo_login" TEXT,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "user_id" TEXT
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_company_user_company_id ON "company_user"("company_id");' }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_company_user_user_id ON "company_user"("user_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "customer" (
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "email" TEXT,
  "fidelidade_contador" REAL DEFAULT 0,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "last_appointment_at" TEXT,
  "name" TEXT,
  "notes" TEXT DEFAULT '{}',
  "phone" TEXT,
  "status" TEXT DEFAULT 'active',
  "tags" TEXT DEFAULT '[]',
  "total_appointments" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_customer_company_id ON "customer"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "financial_entry" (
  "amount" REAL,
  "category" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "date" TEXT,
  "description" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "reference_appointment_id" TEXT,
  "status" TEXT DEFAULT 'confirmado',
  "type" TEXT DEFAULT 'entrada',
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_financial_entry_company_id ON "financial_entry"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "invoice_simulated" (
  "amount" REAL,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "due_date" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "paid_at" TEXT,
  "reference_month" TEXT,
  "status" TEXT DEFAULT 'pendente'
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_invoice_simulated_company_id ON "invoice_simulated"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "plan" (
  "ativo" BOOLEAN DEFAULT 1,
  "checkout_url" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "descricao" TEXT,
  "destaque" BOOLEAN DEFAULT 0,
  "features" TEXT DEFAULT '[]',
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "intervalo" TEXT DEFAULT 'month',
  "limite_agendamentos_mes" REAL DEFAULT 1000,
  "limite_clientes" REAL DEFAULT 1000,
  "limite_profissionais" REAL DEFAULT 3,
  "limite_usuarios" REAL DEFAULT 3,
  "moeda" TEXT DEFAULT 'BRL',
  "nome" TEXT,
  "ordem" REAL DEFAULT 0,
  "preco_cents" REAL DEFAULT 0,
  "provider_price_ids" TEXT DEFAULT '{}',
  "slug" TEXT,
  "trial_days" REAL DEFAULT 14,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": `CREATE TABLE IF NOT EXISTS "product" (
  "ativo" BOOLEAN DEFAULT 1,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "custo_cents" REAL DEFAULT 0,
  "estoque" REAL,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "nome" TEXT,
  "preco_cents" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_product_company_id ON "product"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "professional" (
  "active" BOOLEAN DEFAULT 1,
  "comissao_percentual" REAL DEFAULT 0,
  "commission_type" TEXT,
  "commission_value" REAL,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "name" TEXT,
  "photo_url" TEXT,
  "specialty" TEXT,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "work_schedule" TEXT DEFAULT '{}'
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_professional_company_id ON "professional"("company_id");' }, { "sql": 'CREATE TABLE IF NOT EXISTS "professional_service" (\n  "comissao_percentual" REAL,\n  "commission_type" TEXT,\n  "commission_value" REAL,\n  "professional_id" TEXT,\n  "service_id" TEXT\n);' }, { "sql": `CREATE TABLE IF NOT EXISTS "sale" (
  "appointment_id" TEXT,
  "closed_at" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "created_by" TEXT,
  "customer_id" TEXT,
  "desconto_cents" REAL DEFAULT 0,
  "forma_pagamento" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "observacao" TEXT,
  "professional_id" TEXT,
  "status" TEXT DEFAULT 'aberta',
  "total_cents" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_sale_company_id ON "sale"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "sale_item" (
  "comissao_cents" REAL DEFAULT 0,
  "comissao_percentual" REAL DEFAULT 0,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "descricao" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "preco_cents" REAL DEFAULT 0,
  "professional_id" TEXT,
  "quantidade" REAL DEFAULT 1,
  "ref_id" TEXT,
  "sale_id" TEXT,
  "tipo" TEXT
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_sale_item_company_id ON "sale_item"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "service" (
  "active" BOOLEAN DEFAULT 1,
  "category_id" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "description" TEXT,
  "duration_minutes" REAL DEFAULT 30,
  "featured" BOOLEAN DEFAULT 0,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "name" TEXT,
  "price" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_service_company_id ON "service"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "service_category" (
  "active" BOOLEAN DEFAULT 1,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "name" TEXT,
  "sort_order" REAL DEFAULT 0,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_service_category_company_id ON "service_category"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "subscription" (
  "buyer_email" TEXT,
  "cancel_at_period_end" BOOLEAN DEFAULT 0,
  "canceled_at" TEXT,
  "company_id" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "current_period_end" TEXT,
  "current_period_start" TEXT,
  "external_customer_id" TEXT,
  "external_subscription_id" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "metadata" TEXT DEFAULT '{}',
  "plan_id" TEXT,
  "provider" TEXT DEFAULT 'manual',
  "status" TEXT DEFAULT 'trialing',
  "trial_ends_at" TEXT,
  "updated_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_subscription_company_id ON "subscription"("company_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "trial_identity" (
  "company_id" TEXT,
  "cpf" TEXT,
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "email" TEXT,
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "phone" TEXT,
  "user_id" TEXT
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_trial_identity_company_id ON "trial_identity"("company_id");' }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_trial_identity_user_id ON "trial_identity"("user_id");' }, { "sql": `CREATE TABLE IF NOT EXISTS "user_roles" (
  "created_at" TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  "id" TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-a'||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  "role" TEXT,
  "user_id" TEXT
);` }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON "user_roles"("user_id");' }, { "sql": 'CREATE TABLE IF NOT EXISTS "profiles" (\n  "user_id" TEXT PRIMARY KEY,\n  "email" TEXT,\n  "nome" TEXT\n);' }, { "sql": 'CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON "profiles"("user_id");' }, { "sql": "CREATE UNIQUE INDEX IF NOT EXISTS uniq_company_slug ON company(slug);" }, { "sql": "CREATE UNIQUE INDEX IF NOT EXISTS uniq_plan_slug ON plan(slug);" }, { "sql": "CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_roles_user_id_role ON user_roles(user_id,role);" }, { "sql": "CREATE UNIQUE INDEX IF NOT EXISTS uniq_company_user_company_id_email ON company_user(company_id,email);" }, { "sql": "CREATE UNIQUE INDEX IF NOT EXISTS uniq_professional_service_professional_id_service_id ON professional_service(professional_id,service_id);" }, { "sql": "CREATE UNIQUE INDEX IF NOT EXISTS uniq_subscription_company_id ON subscription(company_id);" }, { "sql": "CREATE UNIQUE INDEX IF NOT EXISTS uniq_appointment_confirm_token ON appointment(confirm_token);" }, { "sql": "CREATE TABLE IF NOT EXISTS template_owner(id TEXT PRIMARY KEY,user_id TEXT NOT NULL);" }, { "sql": "INSERT INTO app_config(id,app_name,super_admin_emails,system_settings) VALUES('config','BarbeiroPro AI','[]','{}') ON CONFLICT(id) DO NOTHING;" }, { "sql": `INSERT INTO plan(id,slug,nome,descricao,preco_cents,limite_profissionais,limite_usuarios,features,ordem) VALUES
 ('starter','starter','Starter','Agenda e cadastro para come\xE7ar',3900,1,1,'["Agenda online","Cadastro de clientes","Link de agendamento"]',1),
 ('pro','pro','Pro','Gest\xE3o completa da barbearia',9900,5,5,'["Profissionais","Comiss\xF5es","Financeiro","Relat\xF3rios","Fidelidade"]',2),
 ('business','business','Business','Gest\xE3o para equipes maiores',19900,50,50,'["Tudo do Pro","Clube de assinaturas","API e webhooks"]',3)
ON CONFLICT(id) DO NOTHING;` }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_company_owner AFTER INSERT ON company WHEN NEW.created_by IS NOT NULL BEGIN\n INSERT INTO company_user(company_id,user_id,email,nome,role,ativo,convite_aceito)\n SELECT NEW.id,p.user_id,p.email,p.nome,'owner',1,1 FROM profiles p WHERE p.user_id=NEW.created_by;\nEND;" }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_company_cleanup AFTER DELETE ON company BEGIN\n DELETE FROM company_user WHERE company_id=OLD.id;\n DELETE FROM professional_service WHERE professional_id IN (SELECT id FROM professional WHERE company_id=OLD.id);\n DELETE FROM appointment WHERE company_id=OLD.id;\n DELETE FROM sale WHERE company_id=OLD.id;\n DELETE FROM sale_item WHERE company_id=OLD.id;\n DELETE FROM financial_entry WHERE company_id=OLD.id;\n DELETE FROM club_member WHERE company_id=OLD.id;\n DELETE FROM club_plan WHERE company_id=OLD.id;\n DELETE FROM customer WHERE company_id=OLD.id;\n DELETE FROM professional WHERE company_id=OLD.id;\n DELETE FROM service WHERE company_id=OLD.id;\n DELETE FROM service_category WHERE company_id=OLD.id;\n DELETE FROM product WHERE company_id=OLD.id;\n DELETE FROM subscription WHERE company_id=OLD.id;\n DELETE FROM invoice_simulated WHERE company_id=OLD.id;\n DELETE FROM trial_identity WHERE company_id=OLD.id;\nEND;" }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_appointment_conflict_insert BEFORE INSERT ON appointment\nWHEN NEW.status NOT IN ('cancelado','faltou','nao_compareceu') BEGIN\n SELECT CASE WHEN EXISTS(SELECT 1 FROM appointment a LEFT JOIN service s ON s.id=a.service_id\n WHERE a.company_id=NEW.company_id AND a.professional_id=NEW.professional_id AND a.status NOT IN ('cancelado','faltou','nao_compareceu')\n AND julianday(a.scheduled_at) < julianday(NEW.scheduled_at)+COALESCE((SELECT duration_minutes FROM service WHERE id=NEW.service_id),30)/1440.0\n AND julianday(NEW.scheduled_at) < julianday(a.scheduled_at)+COALESCE(s.duration_minutes,30)/1440.0)\n THEN RAISE(ABORT,'Esse hor\xE1rio acabou de ser reservado, escolha outro') END;\nEND;" }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_appointment_conflict_update BEFORE UPDATE OF scheduled_at,professional_id,service_id,status ON appointment\nWHEN NEW.status NOT IN ('cancelado','faltou','nao_compareceu') BEGIN\n SELECT CASE WHEN EXISTS(SELECT 1 FROM appointment a LEFT JOIN service s ON s.id=a.service_id\n WHERE a.id<>NEW.id AND a.company_id=NEW.company_id AND a.professional_id=NEW.professional_id AND a.status NOT IN ('cancelado','faltou','nao_compareceu')\n AND julianday(a.scheduled_at) < julianday(NEW.scheduled_at)+COALESCE((SELECT duration_minutes FROM service WHERE id=NEW.service_id),30)/1440.0\n AND julianday(NEW.scheduled_at) < julianday(a.scheduled_at)+COALESCE(s.duration_minutes,30)/1440.0)\n THEN RAISE(ABORT,'Esse hor\xE1rio acabou de ser reservado, escolha outro') END;\nEND;" }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_appointment_complete AFTER UPDATE OF status ON appointment\nWHEN NEW.status='concluido' AND OLD.status<>'concluido' BEGIN\n UPDATE customer SET total_appointments=COALESCE(total_appointments,0)+1,last_appointment_at=NEW.scheduled_at WHERE id=NEW.customer_id AND company_id=NEW.company_id;\nEND;" }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_sale_no_reopen BEFORE UPDATE OF status ON sale\nWHEN OLD.status IN ('fechada','cancelada') AND NEW.status<>OLD.status BEGIN SELECT RAISE(ABORT,'Comanda encerrada n\xE3o pode ser reaberta'); END;" }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_sale_item_insert BEFORE INSERT ON sale_item BEGIN\n SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sale WHERE id=NEW.sale_id AND company_id=NEW.company_id AND status='aberta') THEN RAISE(ABORT,'Comanda indispon\xEDvel') END;\n SELECT CASE WHEN NEW.quantidade<=0 OR NEW.preco_cents<0 THEN RAISE(ABORT,'Quantidade ou pre\xE7o inv\xE1lido') END;\nEND;" }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_sale_item_update BEFORE UPDATE OF preco_cents,quantidade,ref_id,sale_id ON sale_item BEGIN\n SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM sale WHERE id=OLD.sale_id AND status='aberta') THEN RAISE(ABORT,'Comanda encerrada') END;\n SELECT CASE WHEN NEW.quantidade<=0 OR NEW.preco_cents<0 THEN RAISE(ABORT,'Quantidade ou pre\xE7o inv\xE1lido') END;\nEND;" }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_sale_item_delete BEFORE DELETE ON sale_item\nWHEN EXISTS(SELECT 1 FROM sale WHERE id=OLD.sale_id AND status='fechada') BEGIN SELECT RAISE(ABORT,'Comanda encerrada'); END;" }, { "sql": "DROP TRIGGER IF EXISTS native_sale_close;" }, { "sql": "CREATE TRIGGER IF NOT EXISTS native_sale_close_v2 AFTER UPDATE OF status ON sale\nWHEN OLD.status='aberta' AND NEW.status='fechada' BEGIN\n UPDATE sale_item SET comissao_percentual=COALESCE(\n (SELECT CASE WHEN ps.commission_type='fixed' THEN 0 WHEN ps.commission_type='percent' THEN ps.commission_value ELSE ps.comissao_percentual END\n FROM professional_service ps WHERE ps.professional_id=sale_item.professional_id AND ps.service_id=sale_item.ref_id AND sale_item.tipo='servico'),\n (SELECT CASE WHEN p.commission_type='fixed' THEN 0 WHEN p.commission_type='percent' THEN COALESCE(p.commission_value,p.comissao_percentual) ELSE p.comissao_percentual END FROM professional p WHERE p.id=sale_item.professional_id),0) WHERE sale_id=NEW.id;\n UPDATE sale_item SET comissao_cents=CAST(ROUND(COALESCE(\n (SELECT ps.commission_value*100*sale_item.quantidade FROM professional_service ps WHERE ps.professional_id=sale_item.professional_id AND ps.service_id=sale_item.ref_id AND sale_item.tipo='servico' AND ps.commission_type='fixed'),\n (SELECT p.commission_value*100*sale_item.quantidade FROM professional p WHERE p.id=sale_item.professional_id AND p.commission_type='fixed'\n AND NOT EXISTS(SELECT 1 FROM professional_service ps WHERE ps.professional_id=p.id AND ps.service_id=sale_item.ref_id AND sale_item.tipo='servico' AND (ps.commission_type IN ('fixed','percent') OR ps.comissao_percentual IS NOT NULL))),\n preco_cents*quantidade*comissao_percentual/100)) AS INTEGER) WHERE sale_id=NEW.id;\n UPDATE product SET estoque=MAX(0,estoque-COALESCE((SELECT SUM(i.quantidade) FROM sale_item i WHERE i.sale_id=NEW.id AND i.tipo='produto' AND i.ref_id=product.id),0)) WHERE company_id=NEW.company_id AND estoque IS NOT NULL;\n UPDATE sale SET total_cents=MAX(0,COALESCE((SELECT SUM(preco_cents*quantidade) FROM sale_item WHERE sale_id=NEW.id),0)-COALESCE(NEW.desconto_cents,0)),closed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.id;\n INSERT INTO financial_entry(id,company_id,type,status,amount,date,description,category,reference_appointment_id)\n SELECT 'sale:'||id,company_id,'entrada','confirmado',total_cents/100.0,date('now'),'Comanda '||COALESCE(forma_pagamento,''),'sale:'||id,appointment_id FROM sale WHERE id=NEW.id\n ON CONFLICT(id) DO NOTHING;\n UPDATE appointment SET status='concluido',completed_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=NEW.appointment_id AND company_id=NEW.company_id AND status<>'concluido';\n UPDATE customer SET fidelidade_contador=COALESCE(fidelidade_contador,0)+COALESCE((SELECT SUM(quantidade) FROM sale_item WHERE sale_id=NEW.id AND tipo='servico'),0)\n WHERE id=NEW.customer_id AND company_id=NEW.company_id AND EXISTS(SELECT 1 FROM company WHERE id=NEW.company_id AND fidelidade_ativa=1);\nEND;" }];
var ready = /* @__PURE__ */ new Map();
async function ensureDatabase(sql, projectId) {
  if (!ready.has(projectId)) ready.set(projectId, (async () => {
    const check = await sql.sql("SELECT name FROM sqlite_master WHERE type='trigger' AND name='native_sale_close_v2'");
    if (!check.rows.length) await sql.batch(statements, "write");
  })().catch((e) => {
    ready.delete(projectId);
    throw e;
  }));
  await ready.get(projectId);
}

// server/native/sql-adapter.ts
var rowsToColumns = (rows = []) => rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value2]) => [key.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase()), value2])));
function adaptBlinkSql(client) {
  return {
    async sql(query, args) {
      const result = await client.sql(query, args);
      return { ...result, rows: rowsToColumns(result.rows) };
    },
    async batch(statements2, mode) {
      const result = await client.batch(statements2, mode);
      return { ...result, results: (result.results || []).map((item) => ({ ...item, rows: rowsToColumns(item.rows) })) };
    }
  };
}

// server/native/owner.ts
async function ownerEligible(auth, env, sql) {
  if (!auth.userId || !env.BLINK_PROJECT_ID || env.OWNER_PROJECT_ID !== env.BLINK_PROJECT_ID) return false;
  if (env.OWNER_USER_ID && auth.userId === env.OWNER_USER_ID) return true;
  const ownerEmail = env.OWNER_EMAIL?.trim().toLowerCase();
  if (!ownerEmail || auth.email?.trim().toLowerCase() !== ownerEmail) return false;
  const row = (await sql.sql("SELECT email,email_verified FROM users WHERE id=? LIMIT 1", [auth.userId])).rows[0];
  return !!row && Number(row.email_verified) === 1 && String(row.email).trim().toLowerCase() === ownerEmail;
}

// server/native/context.ts
import { createClient } from "@blinkdotnew/sdk";

// shared/query.ts
var Query = class {
  constructor(table, execute) {
    this.execute = execute;
    this.spec = { table, action: "select", columns: "*", filters: [], orders: [] };
  }
  execute;
  spec;
  select(columns = "*", options = {}) {
    this.spec.columns = columns;
    this.spec.head = !!options.head;
    return this;
  }
  filter(key, op, value2) {
    this.spec.filters.push({ key, op, value: value2 });
    return this;
  }
  eq(k, v) {
    return this.filter(k, "eq", v);
  }
  neq(k, v) {
    return this.filter(k, "neq", v);
  }
  is(k, v) {
    return this.filter(k, "is", v);
  }
  gt(k, v) {
    return this.filter(k, "gt", v);
  }
  gte(k, v) {
    return this.filter(k, "gte", v);
  }
  lt(k, v) {
    return this.filter(k, "lt", v);
  }
  lte(k, v) {
    return this.filter(k, "lte", v);
  }
  ilike(k, v) {
    return this.filter(k, "ilike", v);
  }
  in(k, v) {
    return this.filter(k, "in", v);
  }
  not(k, op, v) {
    if (op !== "is" || v !== null) throw new Error("Filtro n\xE3o suportado");
    return this.filter(k, "notnull", null);
  }
  order(key, opts = {}) {
    this.spec.orders.push({ key, ascending: opts.ascending !== false });
    return this;
  }
  limit(n) {
    this.spec.limit = n;
    return this;
  }
  range(a, b) {
    this.spec.offset = a;
    this.spec.limit = b - a + 1;
    return this;
  }
  insert(v) {
    this.spec.action = "insert";
    this.spec.payload = v;
    return this;
  }
  upsert(v, opts = {}) {
    this.spec.action = "upsert";
    this.spec.payload = v;
    this.spec.conflict = opts.onConflict;
    return this;
  }
  update(v) {
    this.spec.action = "update";
    this.spec.payload = v;
    return this;
  }
  delete() {
    this.spec.action = "delete";
    return this;
  }
  single() {
    this.spec.cardinality = "one";
    return this;
  }
  maybeSingle() {
    this.spec.cardinality = "maybe";
    return this;
  }
  then(ok, fail) {
    return this.execute(this.spec).then(ok, fail);
  }
};

// server/native/schema.ts
var schema = {
  "app_config": {
    "app_name": "TEXT",
    "created_at": "TEXT",
    "id": "TEXT",
    "super_admin_emails": "TEXT",
    "system_settings": "TEXT",
    "updated_at": "TEXT"
  },
  "appointment": {
    "company_id": "TEXT",
    "completed_at": "TEXT",
    "confirm_token": "TEXT",
    "confirmed_at": "TEXT",
    "created_at": "TEXT",
    "customer_id": "TEXT",
    "customer_name": "TEXT",
    "customer_phone": "TEXT",
    "id": "TEXT",
    "notes": "TEXT",
    "price": "REAL",
    "professional_id": "TEXT",
    "professional_name": "TEXT",
    "scheduled_at": "TEXT",
    "service_id": "TEXT",
    "service_name": "TEXT",
    "source": "TEXT",
    "status": "TEXT",
    "updated_at": "TEXT"
  },
  "billing_event_log": {
    "buyer_email": "TEXT",
    "created_at": "TEXT",
    "error": "TEXT",
    "event_type": "TEXT",
    "external_id": "TEXT",
    "id": "TEXT",
    "matched_company_id": "TEXT",
    "payload": "TEXT",
    "processed": "BOOLEAN",
    "provider": "TEXT"
  },
  "club_member": {
    "club_plan_id": "TEXT",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "current_period_end": "TEXT",
    "customer_id": "TEXT",
    "id": "TEXT",
    "started_at": "TEXT",
    "status": "TEXT",
    "updated_at": "TEXT"
  },
  "club_plan": {
    "ativo": "BOOLEAN",
    "beneficios": "TEXT",
    "checkout_url": "TEXT",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "id": "TEXT",
    "nome": "TEXT",
    "preco_cents": "REAL",
    "updated_at": "TEXT"
  },
  "company": {
    "business_hours": "TEXT",
    "ciclo": "TEXT",
    "cnpj": "TEXT",
    "cpf_responsavel": "TEXT",
    "created_at": "TEXT",
    "created_by": "TEXT",
    "email_contato": "TEXT",
    "endereco": "TEXT",
    "fidelidade_ativa": "BOOLEAN",
    "fidelidade_meta": "REAL",
    "fidelidade_premio": "TEXT",
    "id": "TEXT",
    "logo_url": "TEXT",
    "name": "TEXT",
    "nome_fantasia": "TEXT",
    "onboarding_concluido": "BOOLEAN",
    "onboarding_step": "REAL",
    "plano": "TEXT",
    "primary_color": "TEXT",
    "proximo_vencimento": "TEXT",
    "razao_social": "TEXT",
    "selected_plan_slug": "TEXT",
    "slug": "TEXT",
    "status_cobranca": "TEXT",
    "telefone_comercial": "TEXT",
    "trial_ate": "TEXT",
    "ultimo_acesso_at": "TEXT",
    "updated_at": "TEXT",
    "valor_mensal": "REAL",
    "whatsapp": "TEXT"
  },
  "company_user": {
    "ativo": "BOOLEAN",
    "company_id": "TEXT",
    "convite_aceito": "BOOLEAN",
    "convite_token": "TEXT",
    "created_at": "TEXT",
    "email": "TEXT",
    "forcar_troca_senha": "BOOLEAN",
    "id": "TEXT",
    "nome": "TEXT",
    "role": "TEXT",
    "ultimo_login": "TEXT",
    "updated_at": "TEXT",
    "user_id": "TEXT"
  },
  "customer": {
    "company_id": "TEXT",
    "created_at": "TEXT",
    "email": "TEXT",
    "fidelidade_contador": "REAL",
    "id": "TEXT",
    "last_appointment_at": "TEXT",
    "name": "TEXT",
    "notes": "TEXT",
    "phone": "TEXT",
    "status": "TEXT",
    "tags": "TEXT",
    "total_appointments": "REAL",
    "updated_at": "TEXT"
  },
  "financial_entry": {
    "amount": "REAL",
    "category": "TEXT",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "date": "TEXT",
    "description": "TEXT",
    "id": "TEXT",
    "reference_appointment_id": "TEXT",
    "status": "TEXT",
    "type": "TEXT",
    "updated_at": "TEXT"
  },
  "invoice_simulated": {
    "amount": "REAL",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "due_date": "TEXT",
    "id": "TEXT",
    "paid_at": "TEXT",
    "reference_month": "TEXT",
    "status": "TEXT"
  },
  "plan": {
    "ativo": "BOOLEAN",
    "checkout_url": "TEXT",
    "created_at": "TEXT",
    "descricao": "TEXT",
    "destaque": "BOOLEAN",
    "features": "TEXT",
    "id": "TEXT",
    "intervalo": "TEXT",
    "limite_agendamentos_mes": "REAL",
    "limite_clientes": "REAL",
    "limite_profissionais": "REAL",
    "limite_usuarios": "REAL",
    "moeda": "TEXT",
    "nome": "TEXT",
    "ordem": "REAL",
    "preco_cents": "REAL",
    "provider_price_ids": "TEXT",
    "slug": "TEXT",
    "trial_days": "REAL",
    "updated_at": "TEXT"
  },
  "product": {
    "ativo": "BOOLEAN",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "custo_cents": "REAL",
    "estoque": "REAL",
    "id": "TEXT",
    "nome": "TEXT",
    "preco_cents": "REAL",
    "updated_at": "TEXT"
  },
  "professional": {
    "active": "BOOLEAN",
    "comissao_percentual": "REAL",
    "commission_type": "TEXT",
    "commission_value": "REAL",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "id": "TEXT",
    "name": "TEXT",
    "photo_url": "TEXT",
    "specialty": "TEXT",
    "updated_at": "TEXT",
    "work_schedule": "TEXT"
  },
  "professional_service": {
    "comissao_percentual": "REAL",
    "commission_type": "TEXT",
    "commission_value": "REAL",
    "professional_id": "TEXT",
    "service_id": "TEXT"
  },
  "sale": {
    "appointment_id": "TEXT",
    "closed_at": "TEXT",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "created_by": "TEXT",
    "customer_id": "TEXT",
    "desconto_cents": "REAL",
    "forma_pagamento": "TEXT",
    "id": "TEXT",
    "observacao": "TEXT",
    "professional_id": "TEXT",
    "status": "TEXT",
    "total_cents": "REAL",
    "updated_at": "TEXT"
  },
  "sale_item": {
    "comissao_cents": "REAL",
    "comissao_percentual": "REAL",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "descricao": "TEXT",
    "id": "TEXT",
    "preco_cents": "REAL",
    "professional_id": "TEXT",
    "quantidade": "REAL",
    "ref_id": "TEXT",
    "sale_id": "TEXT",
    "tipo": "TEXT"
  },
  "service": {
    "active": "BOOLEAN",
    "category_id": "TEXT",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "description": "TEXT",
    "duration_minutes": "REAL",
    "featured": "BOOLEAN",
    "id": "TEXT",
    "name": "TEXT",
    "price": "REAL",
    "updated_at": "TEXT"
  },
  "service_category": {
    "active": "BOOLEAN",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "id": "TEXT",
    "name": "TEXT",
    "sort_order": "REAL",
    "updated_at": "TEXT"
  },
  "subscription": {
    "buyer_email": "TEXT",
    "cancel_at_period_end": "BOOLEAN",
    "canceled_at": "TEXT",
    "company_id": "TEXT",
    "created_at": "TEXT",
    "current_period_end": "TEXT",
    "current_period_start": "TEXT",
    "external_customer_id": "TEXT",
    "external_subscription_id": "TEXT",
    "id": "TEXT",
    "metadata": "TEXT",
    "plan_id": "TEXT",
    "provider": "TEXT",
    "status": "TEXT",
    "trial_ends_at": "TEXT",
    "updated_at": "TEXT"
  },
  "trial_identity": {
    "company_id": "TEXT",
    "cpf": "TEXT",
    "created_at": "TEXT",
    "email": "TEXT",
    "id": "TEXT",
    "phone": "TEXT",
    "user_id": "TEXT"
  },
  "user_roles": {
    "created_at": "TEXT",
    "id": "TEXT",
    "role": "TEXT",
    "user_id": "TEXT"
  },
  "profiles": {
    "user_id": "TEXT",
    "email": "TEXT",
    "nome": "TEXT"
  }
};

// server/native/database.ts
var jsonFields = /* @__PURE__ */ new Set(["beneficios", "business_hours", "endereco", "features", "metadata", "payload", "provider_price_ids", "super_admin_emails", "system_settings", "tags", "work_schedule"]);
var adminTables = /* @__PURE__ */ new Set(["app_config", "billing_event_log", "trial_identity"]);
var secretFields = /* @__PURE__ */ new Set(["openai_api_key", "anthropic_api_key", "access_token", "refresh_token", "webhook_token", "convite_token"]);
var readOnly = /* @__PURE__ */ new Set(["company_user", "user_roles", "subscription", "billing_event_log", "invoice_simulated"]);
var attendantWrites = /* @__PURE__ */ new Set(["appointment", "customer", "sale", "sale_item"]);
var quote = (s) => '"' + s + '"';
var value = (v) => typeof v === "boolean" ? Number(v) : v !== null && typeof v === "object" ? JSON.stringify(v) : v ?? null;
function column(table, key) {
  if (!schema[table]?.[key]) throw new Error("Coluna inv\xE1lida: " + key);
  return quote(key);
}
function parts(input) {
  let depth = 0, start = 0;
  const out = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] === "(") depth++;
    if (input[i] === ")") depth--;
    if (depth < 0) throw new Error("Sele\xE7\xE3o inv\xE1lida");
    if (input[i] === "," && depth === 0) {
      out.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (depth !== 0) throw new Error("Sele\xE7\xE3o inv\xE1lida");
  out.push(input.slice(start).trim());
  return out;
}
function decode(table, row) {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => {
    if (schema[table]?.[k] === "BOOLEAN") return [k, v === true || v === 1 || v === "1" || v === "true"];
    if (v !== null && v !== "" && ["INTEGER", "REAL", "NUMERIC"].includes(schema[table]?.[k]) && Number.isFinite(Number(v))) return [k, Number(v)];
    if (jsonFields.has(k) && typeof v === "string") {
      try {
        return [k, JSON.parse(v)];
      } catch {
      }
    }
    return [k, v];
  }));
}
var Database = class {
  constructor(sql, identity, internal = false, trusted = false) {
    this.sql = sql;
    this.identity = identity;
    this.internal = internal;
    this.trusted = trusted;
  }
  sql;
  identity;
  internal;
  trusted;
  auth;
  rpc;
  from(table) {
    return new Query(table, (s) => this.execute(s));
  }
  async scope(table, write) {
    if (!schema[table]) throw new Error("Tabela indispon\xEDvel");
    const u = this.identity;
    if (this.internal || u.master) return { clause: "1=1", args: [] };
    if (table === "plan") {
      if (write) throw new Error("Acesso restrito");
      return { clause: "ativo=1", args: [] };
    }
    if (!u.userId) throw new Error("Autentica\xE7\xE3o necess\xE1ria");
    if (adminTables.has(table)) throw new Error("Acesso restrito");
    if (write && readOnly.has(table) && !this.trusted) throw new Error("Use a opera\xE7\xE3o autorizada para esta altera\xE7\xE3o");
    if (table === "profiles") return { clause: "user_id = ?", args: [u.userId] };
    if (table === "user_roles") return { clause: "user_id = ?", args: [u.userId] };
    if (table === "company_user" && !u.companyId) return { clause: "user_id = ?", args: [u.userId] };
    if (!u.companyId) throw new Error("Empresa n\xE3o encontrada");
    if (write && !["owner", "admin"].includes(u.role || "") && !attendantWrites.has(table) && !(u.role === "financeiro" && table === "financial_entry")) throw new Error("Permiss\xE3o insuficiente");
    if (["api_token", "webhook_endpoint", "webhook_delivery_log", "google_integration"].includes(table) && !["owner", "admin"].includes(u.role || "")) throw new Error("Acesso restrito");
    if (table === "professional_service") return { clause: "professional_id IN (SELECT id FROM professional WHERE company_id=?)", args: [u.companyId] };
    return { clause: (table === "company" ? "id" : "company_id") + " = ?", args: [u.companyId] };
  }
  async project(table, rows, selection, depth = 0) {
    if (depth > 2) throw new Error("Relacionamento muito profundo");
    const fields = parts(selection), all = fields.includes("*");
    const result = [];
    for (const raw2 of rows) {
      const row = decode(table, raw2), out = {};
      if (all) {
        for (const [k, v] of Object.entries(row)) if (this.internal || !secretFields.has(k)) out[k] = v;
      }
      for (const field of fields) {
        if (field === "*") continue;
        const match2 = /^(\w+)(?::(\w+))?\((.*)\)$/.exec(field);
        if (match2) {
          const alias = match2[1], target = alias === "profiles" ? "profiles" : (match2[2] || alias).replace(/_id$/, "");
          if (!["company", "plan", "profiles", "customer", "service", "professional", "service_category", "club_plan", "sale", "appointment"].includes(target)) throw new Error("Relacionamento inv\xE1lido");
          const fk = match2[2]?.endsWith("_id") ? match2[2] : target === "profiles" ? "user_id" : target + "_id", pk = target === "profiles" ? "user_id" : "id";
          if (raw2[fk] == null) {
            out[alias] = null;
            continue;
          }
          const related = (await this.sql.sql("SELECT * FROM " + quote(target) + " WHERE " + quote(pk) + " = ? LIMIT 1", [raw2[fk]])).rows;
          if (target === "profiles" && !this.internal) {
            out[alias] = related[0] ? Object.fromEntries(["user_id", "nome", "email"].filter((k) => match2[3] === "*" || parts(match2[3]).includes(k)).map((k) => [k, related[0][k]])) : null;
          } else out[alias] = (await this.project(target, related, match2[3], depth + 1))[0] ?? null;
        } else {
          column(table, field);
          if (!this.internal && secretFields.has(field)) throw new Error("Campo protegido");
          out[field] = row[field];
        }
      }
      result.push(out);
    }
    return result;
  }
  async execute(input) {
    try {
      const s = structuredClone(input), table = s.table, write = s.action !== "select";
      if (!["select", "insert", "upsert", "update", "delete"].includes(s.action)) throw new Error("Opera\xE7\xE3o inv\xE1lida");
      const scope = await this.scope(table, write), args = [...scope.args], conditions = [scope.clause];
      if (!Array.isArray(s.filters) || s.filters.length > 30) throw new Error("Filtros inv\xE1lidos");
      for (const f of s.filters) {
        const key = column(table, f.key);
        if (f.op === "in") {
          if (!Array.isArray(f.value) || f.value.length > 1e3) throw new Error("Filtro inv\xE1lido");
          conditions.push(f.value.length ? key + " IN (" + f.value.map(() => "?").join(",") + ")" : "0=1");
          args.push(...f.value.map(value));
          continue;
        }
        if (f.op === "notnull") {
          conditions.push(key + " IS NOT NULL");
          continue;
        }
        const op = { eq: "=", neq: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=", is: "IS", ilike: "LIKE" };
        if (!op[f.op]) throw new Error("Operador inv\xE1lido");
        conditions.push(key + " " + op[f.op] + " ?" + (f.op === "ilike" ? " COLLATE NOCASE" : ""));
        args.push(value(f.value));
      }
      const where = conditions.join(" AND "), limit = Math.min(5e3, Math.max(0, Number(s.limit ?? 1e3))), offset = Math.max(0, Number(s.offset ?? 0));
      if (!Number.isInteger(limit) || !Number.isInteger(offset)) throw new Error("Pagina\xE7\xE3o inv\xE1lida");
      const order2 = s.orders?.length ? " ORDER BY " + s.orders.map((o) => column(table, o.key) + (o.ascending ? " ASC" : " DESC")).join(",") : "";
      let rows = [], count = 0;
      if (!write) {
        count = Number((await this.sql.sql("SELECT COUNT(*) AS total FROM " + quote(table) + " WHERE " + where, args)).rows[0]?.total || 0);
        if (!s.head) rows = (await this.sql.sql("SELECT * FROM " + quote(table) + " WHERE " + where + order2 + " LIMIT ? OFFSET ?", [...args, limit, offset])).rows;
      } else {
        if (!["insert", "upsert"].includes(s.action) && s.filters.length === 0) throw new Error("Altera\xE7\xE3o exige filtro expl\xEDcito");
        if (s.action === "delete") {
          rows = (await this.sql.sql("DELETE FROM " + quote(table) + " WHERE " + where + " RETURNING *", args)).rows;
        } else {
          const payloads = Array.isArray(s.payload) ? s.payload : [s.payload];
          if (payloads.length > 1e3) throw new Error("Lote muito grande");
          for (const raw2 of payloads) {
            if (!raw2 || typeof raw2 !== "object") throw new Error("Dados inv\xE1lidos");
            const row = { ...raw2 };
            if (table === "professional" || table === "professional_service") {
              if (row.commission_type !== void 0 && !["fixed", "percent"].includes(row.commission_type)) throw new Error("Tipo de comiss\xE3o inv\xE1lido");
              for (const key of ["commission_value", "comissao_percentual"]) if (row[key] != null && (!Number.isFinite(Number(row[key])) || Number(row[key]) < 0 || (key === "comissao_percentual" || row.commission_type === "percent") && Number(row[key]) > 100)) throw new Error("Valor de comiss\xE3o inv\xE1lido");
            }
            if (!this.internal && !this.identity.master) {
              for (const k of Object.keys(row)) if (secretFields.has(k) || ["status_cobranca", "trial_ate", "selected_plan_slug", "plano", "valor_mensal", "ciclo"].includes(k)) throw new Error("Campo protegido: " + k);
              if (table === "profiles") {
                if (row.created_by && row.created_by !== this.identity.userId) throw new Error("Autor inv\xE1lido");
                if (row.user_id && row.user_id !== this.identity.userId) throw new Error("Usu\xE1rio inv\xE1lido");
                row.user_id = this.identity.userId;
              } else if (table !== "company" && table !== "professional_service") {
                if (row.company_id && row.company_id !== this.identity.companyId) throw new Error("Empresa inv\xE1lida");
                row.company_id = this.identity.companyId;
              }
              if (row.created_by && row.created_by !== this.identity.userId) throw new Error("Autor inv\xE1lido");
              if (row.user_id && row.user_id !== this.identity.userId) throw new Error("Usu\xE1rio inv\xE1lido");
              if (s.action === "update") delete row.id;
              for (const [fk, target] of [["category_id", "service_category"], ["service_id", "service"], ["professional_id", "professional"], ["customer_id", "customer"], ["sale_id", "sale"], ["club_plan_id", "club_plan"], ["appointment_id", "appointment"], ["reference_appointment_id", "appointment"]]) if (row[fk]) {
                const r = await this.sql.sql("SELECT id FROM " + target + " WHERE id = ? AND company_id = ?", [row[fk], this.identity.companyId]);
                if (!r.rows.length) throw new Error("Refer\xEAncia de outra empresa");
              }
              if (table === "sale_item" && (row.ref_id !== void 0 || row.tipo !== void 0)) {
                const existing = s.action === "update" ? (await this.sql.sql("SELECT ref_id,tipo FROM sale_item WHERE " + where, args)).rows : [];
                const candidates = existing.length ? existing.map((x) => ({ ...x, ...row })) : [row];
                for (const item of candidates) {
                  const target = item.tipo === "produto" ? "product" : item.tipo === "servico" ? "service" : null;
                  if (!target || !item.ref_id) throw new Error("Item inv\xE1lido");
                  const found = await this.sql.sql("SELECT id FROM " + target + " WHERE id=? AND company_id=?", [item.ref_id, this.identity.companyId]);
                  if (!found.rows.length) throw new Error("Refer\xEAncia de outra empresa");
                }
              }
              if (s.action === "insert" && row.id) {
                const existing = await this.sql.sql("SELECT id FROM " + quote(table) + " WHERE id = ?", [row.id]);
                if (existing.rows.length) throw new Error("Registro j\xE1 existe");
              }
            }
            if (s.action !== "update" && schema[table].id && !row.id) row.id = crypto.randomUUID();
            if (s.action === "update" && schema[table].updated_at) row.updated_at = (/* @__PURE__ */ new Date()).toISOString();
            const keys = Object.keys(row);
            keys.forEach((k) => column(table, k));
            if (!keys.length) throw new Error("Dados vazios");
            let statement, params;
            if (s.action === "update") {
              statement = "UPDATE " + quote(table) + " SET " + keys.map((k) => quote(k) + " = ?").join(",") + " WHERE " + where + " RETURNING *";
              params = [...keys.map((k) => value(row[k])), ...args];
            } else {
              statement = "INSERT INTO " + quote(table) + " (" + keys.map(quote).join(",") + ") VALUES (" + keys.map(() => "?").join(",") + ")";
              params = keys.map((k) => value(row[k]));
              if (s.action === "upsert") {
                const conflict = (s.conflict || (schema[table].id ? "id" : table === "profiles" ? "user_id" : "company_id")).split(",").map((k) => k.trim());
                conflict.forEach((k) => column(table, k));
                const updates = keys.filter((k) => !conflict.includes(k) && k !== "id");
                if (!this.internal && !this.identity.master && table !== "profiles" && table !== "professional_service" && !conflict.includes("company_id")) throw new Error("Upsert exige chave da empresa");
                statement += " ON CONFLICT (" + conflict.map(quote).join(",") + ") " + (updates.length ? "DO UPDATE SET " + updates.map((k) => quote(k) + "=excluded." + quote(k)).join(",") : "DO NOTHING");
              }
              statement += " RETURNING *";
            }
            rows.push(...(await this.sql.sql(statement, params)).rows);
          }
        }
        count = rows.length;
      }
      const projected = await this.project(table, rows, s.columns || "*");
      if (s.cardinality === "one" && projected.length !== 1) throw new Error("Esperado exatamente um registro");
      if (s.cardinality === "maybe" && projected.length > 1) throw new Error("Mais de um registro encontrado");
      return { data: s.head ? null : s.cardinality ? projected[0] ?? null : projected, error: null, count };
    } catch (error) {
      return { data: null, error: { message: error.message || String(error) }, count: 0 };
    }
  }
};

// server/native/context.ts
async function makeContext(request, env, publicWebhook = false) {
  const blink = createClient({ projectId: env.BLINK_PROJECT_ID, secretKey: env.BLINK_SECRET_KEY, auth: { mode: "headless" } });
  const sql = adaptBlinkSql(blink.db);
  await ensureDatabase(sql, env.BLINK_PROJECT_ID);
  const header = publicWebhook ? null : request.headers.get("authorization");
  const auth = header ? await blink.auth.verifyToken(header) : { valid: false };
  if (header && (!auth.valid || !("userId" in auth) || !auth.userId || auth.projectId !== env.BLINK_PROJECT_ID)) throw new Error("Sess\xE3o inv\xE1lida");
  const userId = auth.valid && "userId" in auth ? auth.userId || "" : "";
  const email = auth.valid && "email" in auth ? String(auth.email || "").toLowerCase() : "";
  if (userId) {
    await sql.sql("INSERT INTO profiles(user_id,email) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email", [userId, email]);
    if (await ownerEligible({ userId, email }, env, sql)) await sql.batch([
      { sql: "INSERT INTO template_owner(id,user_id) VALUES(?,?) ON CONFLICT(id) DO NOTHING", args: ["owner", userId] },
      { sql: "INSERT INTO user_roles(id,user_id,role) SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM template_owner WHERE id='owner' AND user_id=?) ON CONFLICT(user_id,role) DO NOTHING", args: ["owner:" + userId, userId, "super_admin", userId] }
    ], "write");
    const verified = (await sql.sql("SELECT email,email_verified FROM users WHERE id=?", [userId])).rows[0];
    if (Number(verified?.email_verified) === 1 && String(verified.email).toLowerCase() === email)
      await sql.sql("UPDATE company_user SET user_id=?,convite_aceito=1 WHERE LOWER(email)=? AND user_id IS NULL", [userId, email]);
  }
  const member = userId ? (await sql.sql("SELECT company_id,role FROM company_user WHERE user_id=? AND ativo=1 ORDER BY created_at LIMIT 1", [userId])).rows[0] : null;
  const master = userId ? !!(await sql.sql("SELECT 1 FROM user_roles WHERE user_id=? AND role='super_admin' LIMIT 1", [userId])).rows.length : false;
  const identity = { userId, email, master, companyId: member?.company_id, role: member?.role };
  const admin = new Database(sql, identity, true, true), scoped = new Database(sql, identity, false, true);
  admin.auth = { admin: {
    async createUser() {
      return { data: { user: null }, error: { message: "Use Entrar com minha conta Blink para criar e verificar a conta." } };
    },
    async updateUserById() {
      return { error: { message: "O titular gerencia sua senha na tela de acesso Blink." } };
    },
    async listUsers({ page = 1, perPage = 200 }) {
      const rows = (await sql.sql("SELECT user_id,email FROM profiles ORDER BY user_id LIMIT ? OFFSET ?", [perPage, (page - 1) * perPage])).rows;
      return { data: { users: rows.map((r) => ({ id: r.user_id, email: r.email })) }, error: null };
    },
    async getUserById(id2) {
      const row = (await sql.sql("SELECT user_id,email FROM profiles WHERE user_id=?", [id2])).rows[0];
      return { data: { user: row ? { id: row.user_id, email: row.email } : null }, error: null };
    }
  } };
  for (const db of [admin, scoped]) db.rpc = async (name, args = {}) => {
    try {
      const cid = args._company_id;
      if (name === "is_super_admin") return { data: identity.master, error: null };
      if (name === "has_company_role") {
        const row = (await sql.sql("SELECT role FROM company_user WHERE company_id=? AND user_id=? AND ativo=1", [cid, userId])).rows[0];
        return { data: identity.master || !!row && Array.isArray(args._roles) && args._roles.includes(row.role), error: null };
      }
      if (name === "close_sale") {
        const sale = (await sql.sql("SELECT * FROM sale WHERE id=?", [args._sale_id])).rows[0];
        if (!sale || !master && (sale.company_id !== identity.companyId || !["owner", "admin", "recepcao", "financeiro"].includes(identity.role || ""))) throw new Error("Sem acesso a esta comanda");
        if (sale.status === "cancelada") throw new Error("Comanda cancelada");
        const discount = args._desconto_cents == null ? Number(sale.desconto_cents || 0) : Number(args._desconto_cents);
        if (!Number.isInteger(discount) || discount < 0) throw new Error("Desconto inv\xE1lido");
        await sql.sql("UPDATE sale SET status='fechada',desconto_cents=?,forma_pagamento=COALESCE(?,forma_pagamento) WHERE id=? AND status='aberta'", [discount, args._forma_pagamento || null, sale.id]);
        return { data: (await sql.sql("SELECT * FROM sale WHERE id=?", [sale.id])).rows[0], error: null };
      }
      if (db.internal && name === "trial_identity_conflict") {
        const row = (await sql.sql("SELECT email,cpf,phone FROM trial_identity WHERE email=? OR cpf=? OR phone=? LIMIT 1", [args._email, args._cpf, args._phone])).rows[0];
        return { data: row ? row.email === args._email ? "email" : row.cpf === args._cpf ? "cpf" : "phone" : null, error: null };
      }
      throw new Error("Opera\xE7\xE3o n\xE3o dispon\xEDvel: " + name);
    } catch (error) {
      return { data: null, error: { message: error.message } };
    }
  };
  return { blink, sql, identity, admin, scoped, request, env };
}

// node_modules/zod/index.js
var zod_exports = {};
__export(zod_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  default: () => zod_default,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType,
  z: () => external_exports
});

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value2) => {
    if (typeof value2 === "bigint") {
      return value2.toString();
    }
    return value2;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value2) {
    if (!(value2 instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value2}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value2 = await pair.value;
      syncPairs.push({
        key,
        value: value2
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value: value2 } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value2.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value2.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value2.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value2.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value2) => ({ status: "dirty", value: value2 });
var OK = (value2) => ({ status: "valid", value: value2 });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value2, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value2;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value2, options) {
    return this._addCheck({
      kind: "includes",
      value: value2,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value2, message) {
    return this._addCheck({
      kind: "startsWith",
      value: value2,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value2, message) {
    return this._addCheck({
      kind: "endsWith",
      value: value2,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value2, message) {
    return this.setLimit("min", value2, true, errorUtil.toString(message));
  }
  gt(value2, message) {
    return this.setLimit("min", value2, false, errorUtil.toString(message));
  }
  lte(value2, message) {
    return this.setLimit("max", value2, true, errorUtil.toString(message));
  }
  lt(value2, message) {
    return this.setLimit("max", value2, false, errorUtil.toString(message));
  }
  setLimit(kind, value2, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value: value2,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value2, message) {
    return this._addCheck({
      kind: "multipleOf",
      value: value2,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value2, message) {
    return this.setLimit("min", value2, true, errorUtil.toString(message));
  }
  gt(value2, message) {
    return this.setLimit("min", value2, false, errorUtil.toString(message));
  }
  lte(value2, message) {
    return this.setLimit("max", value2, true, errorUtil.toString(message));
  }
  lt(value2, message) {
    return this.setLimit("max", value2, false, errorUtil.toString(message));
  }
  setLimit(kind, value2, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value: value2,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value2, message) {
    return this._addCheck({
      kind: "multipleOf",
      value: value2,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema2, params) => {
  return new ZodArray({
    type: schema2,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema2) {
  if (schema2 instanceof ZodObject) {
    const newShape = {};
    for (const key in schema2.shape) {
      const fieldSchema = schema2.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema2._def,
      shape: () => newShape
    });
  } else if (schema2 instanceof ZodArray) {
    return new ZodArray({
      ...schema2._def,
      type: deepPartialify(schema2.element)
    });
  } else if (schema2 instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema2.unwrap()));
  } else if (schema2 instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema2.unwrap()));
  } else if (schema2 instanceof ZodTuple) {
    return ZodTuple.create(schema2.items.map((item) => deepPartialify(item)));
  } else {
    return schema2;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value2 = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value2, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value2 = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value2, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value2 = await pair.value;
          syncPairs.push({
            key,
            value: value2,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema2) {
    return this.augment({ [key]: schema2 });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value2 of discriminatorValues) {
        if (optionsMap.has(value2)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value2)}`);
        }
        optionsMap.set(value2, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema2 = this._def.items[itemIndex] || this._def.rest;
      if (!schema2)
        return null;
      return schema2._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value2], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value2, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value2 = await pair.value;
          if (key.status === "aborted" || value2.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value2.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value2.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value2 = pair.value;
        if (key.status === "aborted" || value2.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value2.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value2.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value2, params) => {
  return new ZodLiteral({
    value: value2,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema2, params) => {
  return new ZodPromise({
    type: schema2,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema2, effect, params) => {
  return new ZodEffects({
    schema: schema2,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema2, params) => {
  return new ZodEffects({
    schema: schema2,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = /* @__PURE__ */ Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// node_modules/zod/index.js
var zod_default = external_exports;

// server/native/public-booking.ts
var id = external_exports.string().min(1).max(100);
async function publicBooking(ctx, body) {
  const { sql, admin } = ctx, op = body.op, data = body.data || {};
  if (op === "company") {
    const slug = external_exports.string().min(1).max(100).parse(data.slug);
    const rows = (await sql.sql("SELECT id,name,nome_fantasia,logo_url,primary_color,whatsapp,endereco,business_hours FROM company WHERE slug=? AND status_cobranca NOT IN ('cancelado','suspenso') LIMIT 1", [slug])).rows;
    return rows[0] ? { ...rows[0], endereco: JSON.parse(rows[0].endereco || "{}"), business_hours: JSON.parse(rows[0].business_hours || "{}") } : null;
  }
  if (["services", "professionals", "get_busy_slots", "book"].includes(op)) {
    const cid = id.parse(data.company_id || data._company_id);
    const company = (await sql.sql("SELECT id FROM company WHERE id=? AND slug IS NOT NULL AND status_cobranca NOT IN ('cancelado','suspenso') LIMIT 1", [cid])).rows[0];
    if (!company) throw new Error("Barbearia indispon\xEDvel");
    if (op === "services") return (await sql.sql("SELECT id,name,price,duration_minutes,category_id FROM service WHERE company_id=? AND active=1 ORDER BY name", [cid])).rows;
    if (op === "professionals") return (await sql.sql("SELECT id,name,specialty,photo_url FROM professional WHERE company_id=? AND active=1 ORDER BY name", [cid])).rows;
    if (op === "get_busy_slots") {
      const day = external_exports.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(data._date);
      return (await sql.sql("SELECT a.scheduled_at AS starts_at,strftime('%Y-%m-%dT%H:%M:%fZ',a.scheduled_at,'+'||COALESCE(s.duration_minutes,30)||' minutes') AS ends_at FROM appointment a LEFT JOIN service s ON s.id=a.service_id WHERE a.company_id=? AND a.professional_id=? AND a.status NOT IN ('cancelado','faltou','nao_compareceu') AND substr(a.scheduled_at,1,10)=?", [cid, id.parse(data._professional_id), day])).rows;
    }
    const input = external_exports.object({ service_id: id, professional_id: id, name: external_exports.string().trim().min(2).max(120), phone: external_exports.string().regex(/^\+?[\d ()-]{8,25}$/), scheduled_at: external_exports.string().datetime() }).parse(data);
    if (new Date(input.scheduled_at).getTime() < Date.now() - 6e4) throw new Error("Escolha um hor\xE1rio futuro");
    const svc = (await sql.sql("SELECT * FROM service WHERE id=? AND company_id=? AND active=1", [input.service_id, cid])).rows[0];
    const pro = (await sql.sql("SELECT * FROM professional WHERE id=? AND company_id=? AND active=1", [input.professional_id, cid])).rows[0];
    if (!svc || !pro) throw new Error("Servi\xE7o ou profissional indispon\xEDvel");
    const phone = input.phone.replace(/\D/g, "");
    let customer = (await sql.sql("SELECT id FROM customer WHERE company_id=? AND phone=? LIMIT 1", [cid, phone])).rows[0];
    const apptId = crypto.randomUUID(), customerId = customer?.id || crypto.randomUUID();
    const statements2 = [];
    if (!customer) statements2.push({ sql: "INSERT INTO customer(id,company_id,name,phone) VALUES(?,?,?,?)", args: [customerId, cid, input.name, phone] });
    statements2.push({ sql: "INSERT INTO appointment(id,company_id,customer_id,professional_id,service_id,customer_name,customer_phone,professional_name,service_name,price,scheduled_at,source,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,'online','agendado')", args: [apptId, cid, customerId, pro.id, svc.id, input.name, phone, pro.name, svc.name, svc.price, input.scheduled_at] });
    await sql.batch(statements2, "write");
    return { id: apptId };
  }
  if (["get_appointment_by_token", "confirm_appointment_by_token", "cancel_appointment_by_token"].includes(op)) {
    const token = external_exports.string().regex(/^[a-f0-9]{32,64}$/).parse(data._token);
    if (op === "get_appointment_by_token") return (await sql.sql("SELECT a.id,a.scheduled_at,a.status,a.confirmed_at,a.service_name,a.professional_name,a.customer_name,c.id AS company_id,COALESCE(c.nome_fantasia,c.name) AS company_nome,c.primary_color AS company_primary_color,c.telefone_comercial AS company_telefone,c.endereco AS company_endereco FROM appointment a JOIN company c ON c.id=a.company_id WHERE a.confirm_token=? LIMIT 1", [token])).rows;
    const rows = (await sql.sql("UPDATE appointment SET status=?,confirmed_at=? WHERE confirm_token=? AND status IN ('agendado','confirmado') RETURNING id", [op === "cancel_appointment_by_token" ? "cancelado" : "confirmado", (/* @__PURE__ */ new Date()).toISOString(), token])).rows;
    return rows.length > 0;
  }
  throw new Error("Opera\xE7\xE3o p\xFAblica inv\xE1lida");
}

// server/native/domain.ts
var publicRoutes = { "/api/public/billing/webhook": "src/routes/api/public/billing/webhook" };
var rpcAllowlist = { "src/lib/auth-signup.functions": ["checkEmailExists", "signupTrial"], "src/lib/billing.functions": ["getBillingWebhookInfo", "regenerateWebhookToken", "listBillingEvents"], "src/lib/master.functions": ["createBarbershopWithOwner", "setSuperAdminEmails", "setAppBrand"], "src/lib/users.functions": ["signUpInterno", "resetAdminPassword", "createTeamMember", "updateTeamMemberRole", "setTeamMemberActive", "resetTeamMemberPassword", "removeTeamMember"] };
var factories = {
  "src/lib/auth-signup.functions": (module, exports, require2, process) => {
    "use strict";
    var __createBinding = Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    };
    var __importStar = /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.signupTrial = exports.checkEmailExists = void 0;
    const react_start_1 = require2("@tanstack/react-start");
    const zod_1 = require2("zod");
    const auth_signup_server_1 = require2("src/lib/auth-signup.server");
    const CheckEmailSchema = zod_1.z.object({ email: zod_1.z.string().trim().email().max(255) });
    exports.checkEmailExists = (0, react_start_1.createServerFn)({ method: "POST" }).inputValidator((input) => CheckEmailSchema.parse(input)).handler(async ({ data }) => {
      const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
      const email = data.email.toLowerCase();
      let page = 1;
      for (; ; ) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (error)
          throw new Error(error.message);
        const found = list?.users.find((u) => (u.email ?? "").toLowerCase() === email);
        if (found)
          return { exists: true };
        if (!list?.users || list.users.length < 200)
          return { exists: false };
        page += 1;
        if (page > 25)
          return { exists: false };
      }
    });
    const SignupTrialSchema = zod_1.z.object({
      email: zod_1.z.string().trim().email().max(255),
      password: zod_1.z.string().min(6).max(72),
      nome: zod_1.z.string().trim().min(2).max(200),
      cpf: zod_1.z.string().min(11).max(20),
      phone: zod_1.z.string().min(10).max(20),
      plan_slug: zod_1.z.string().trim().max(80).optional()
    });
    const _attempts = /* @__PURE__ */ new Map();
    function rateLimit(key) {
      const now = Date.now();
      const list = (_attempts.get(key) ?? []).filter((t) => now - t < 10 * 60 * 1e3);
      if (list.length >= 5)
        throw new Error("Muitas tentativas. Aguarde alguns minutos.");
      list.push(now);
      _attempts.set(key, list);
    }
    exports.signupTrial = (0, react_start_1.createServerFn)({ method: "POST" }).inputValidator((input) => SignupTrialSchema.parse(input)).handler(async ({ data }) => {
      const email = data.email.toLowerCase();
      const cpf = (0, auth_signup_server_1.onlyDigits)(data.cpf);
      const phone = (0, auth_signup_server_1.normalizePhone)(data.phone);
      if (!(0, auth_signup_server_1.isValidCPF)(cpf))
        throw new Error("CPF inv\xE1lido.");
      if (!phone)
        throw new Error("Telefone inv\xE1lido. Use DDD + n\xFAmero.");
      rateLimit(email);
      rateLimit(cpf);
      const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
      const { data: conflict, error: cErr } = await supabaseAdmin.rpc("trial_identity_conflict", { _email: email, _cpf: cpf, _phone: phone });
      if (cErr)
        throw new Error(cErr.message);
      if (conflict) {
        const map = {
          email: "J\xE1 existe uma conta com este email. Fa\xE7a login.",
          cpf: "J\xE1 existe uma conta cadastrada com este CPF.",
          phone: "J\xE1 existe uma conta cadastrada com este telefone."
        };
        throw new Error(map[conflict] ?? "Dados j\xE1 cadastrados.");
      }
      let trialDays = 14;
      let planId = null;
      if (data.plan_slug) {
        const { data: plan } = await supabaseAdmin.from("plan").select("id, trial_days").eq("slug", data.plan_slug).eq("ativo", true).maybeSingle();
        if (plan) {
          planId = plan.id;
          if (plan.trial_days && plan.trial_days > 0)
            trialDays = plan.trial_days;
        }
      }
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { nome: data.nome, cpf, phone }
      });
      if (createErr)
        throw new Error(createErr.message);
      const userId = created.user?.id;
      if (!userId)
        throw new Error("Falha ao criar usu\xE1rio.");
      const trialAte = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1e3).toISOString().slice(0, 10);
      const { data: company, error: companyErr } = await supabaseAdmin.from("company").insert({
        name: data.nome,
        nome_fantasia: data.nome,
        email_contato: email,
        telefone_comercial: phone,
        cpf_responsavel: cpf,
        status_cobranca: "trial",
        trial_ate: trialAte,
        selected_plan_slug: data.plan_slug ?? null,
        created_by: userId
      }).select("id").single();
      if (companyErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(companyErr.message);
      }
      const { error: cuErr } = await supabaseAdmin.from("company_user").insert({
        company_id: company.id,
        user_id: userId,
        email,
        nome: data.nome,
        role: "owner",
        ativo: true,
        convite_aceito: true,
        forcar_troca_senha: false
      });
      if (cuErr) {
        await supabaseAdmin.from("company").delete().eq("id", company.id);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw new Error(cuErr.message);
      }
      if (planId) {
        await supabaseAdmin.from("subscription").insert({
          company_id: company.id,
          plan_id: planId,
          status: "trialing",
          buyer_email: email,
          trial_ends_at: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1e3).toISOString()
        });
      }
      const { error: tiErr } = await supabaseAdmin.from("trial_identity").insert({
        user_id: userId,
        company_id: company.id,
        email,
        cpf,
        phone
      });
      if (tiErr) {
        console.error("trial_identity insert failed:", tiErr.message);
      }
      return { ok: true, company_id: company.id, trial_ate: trialAte };
    });
  },
  "src/lib/auth-signup.server": (module, exports, require2, process) => {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.onlyDigits = onlyDigits;
    exports.normalizePhone = normalizePhone;
    exports.isValidCPF = isValidCPF;
    function onlyDigits(s) {
      return (s ?? "").replace(/\D/g, "");
    }
    function normalizePhone(raw2) {
      const d = onlyDigits(raw2);
      if (d.length < 10 || d.length > 13)
        return "";
      return d;
    }
    function isValidCPF(raw2) {
      const cpf = onlyDigits(raw2);
      if (cpf.length !== 11)
        return false;
      if (/^(\d)\1{10}$/.test(cpf))
        return false;
      const calc = (slice) => {
        let sum = 0;
        for (let i = 0; i < slice; i++)
          sum += parseInt(cpf[i], 10) * (slice + 1 - i);
        const r = sum * 10 % 11;
        return r === 10 ? 0 : r;
      };
      return calc(9) === parseInt(cpf[9], 10) && calc(10) === parseInt(cpf[10], 10);
    }
  },
  "src/lib/billing.functions": (module, exports, require2, process) => {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.listBillingEvents = exports.regenerateWebhookToken = exports.getBillingWebhookInfo = void 0;
    const react_start_1 = require2("@tanstack/react-start");
    const zod_1 = require2("zod");
    const auth_middleware_1 = require2("@/integrations/supabase/auth-middleware");
    const client_server_1 = require2("@/integrations/supabase/client.server");
    const PROVIDERS = ["kiwify", "cakto", "perfectpay", "hotmart", "kirvano"];
    function randomToken(len = 24) {
      const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const bytes = crypto.getRandomValues(new Uint8Array(len));
      let out = "";
      for (let i = 0; i < len; i++)
        out += chars[bytes[i] % chars.length];
      return out;
    }
    async function assertSuperAdmin(ctx) {
      const { data: isAdmin, error } = await ctx.supabase.rpc("is_super_admin");
      if (error)
        throw new Error(error.message);
      if (!isAdmin)
        throw new Error("Apenas super admin.");
    }
    async function loadOrInitConfig() {
      const { data: existing } = await client_server_1.supabaseAdmin.from("app_config").select("id, system_settings").limit(1).maybeSingle();
      if (existing?.id)
        return existing;
      const { data: created } = await client_server_1.supabaseAdmin.from("app_config").insert({ app_name: "BarbeiroPro AI", super_admin_emails: [], system_settings: {} }).select("id, system_settings").single();
      return created;
    }
    async function ensureTokens() {
      const cfg = await loadOrInitConfig();
      const settings = cfg.system_settings ?? {};
      const current = settings.webhook_tokens ?? {};
      let changed = false;
      const out = { ...current };
      for (const p of PROVIDERS) {
        if (!out[p]) {
          out[p] = randomToken(24);
          changed = true;
        }
      }
      if (changed) {
        await client_server_1.supabaseAdmin.from("app_config").update({ system_settings: { ...settings, webhook_tokens: out } }).eq("id", cfg.id);
      }
      return out;
    }
    exports.getBillingWebhookInfo = (0, react_start_1.createServerFn)({ method: "GET" }).middleware([auth_middleware_1.requireSupabaseAuth]).handler(async ({ context }) => {
      await assertSuperAdmin(context);
      const tokens = await ensureTokens();
      const baseUrl = "https://" + process.env.BLINK_PROJECT_ID.slice(-8) + ".backend.blink.new";
      return { baseUrl, tokens };
    });
    exports.regenerateWebhookToken = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => zod_1.z.object({ provider: zod_1.z.enum(PROVIDERS) }).parse(input)).handler(async ({ data, context }) => {
      await assertSuperAdmin(context);
      const cfg = await loadOrInitConfig();
      const settings = cfg.system_settings ?? {};
      const current = settings.webhook_tokens ?? {};
      const next = randomToken(24);
      current[data.provider] = next;
      await client_server_1.supabaseAdmin.from("app_config").update({ system_settings: { ...settings, webhook_tokens: current } }).eq("id", cfg.id);
      return { provider: data.provider, token: next };
    });
    exports.listBillingEvents = (0, react_start_1.createServerFn)({ method: "GET" }).middleware([auth_middleware_1.requireSupabaseAuth]).handler(async ({ context }) => {
      await assertSuperAdmin(context);
      const { data } = await client_server_1.supabaseAdmin.from("billing_event_log").select("id, provider, event_type, buyer_email, matched_company_id, processed, error, created_at").order("created_at", { ascending: false }).limit(20);
      return { events: data ?? [] };
    });
  },
  "src/lib/master.functions": (module, exports, require2, process) => {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setAppBrand = exports.setSuperAdminEmails = exports.createBarbershopWithOwner = void 0;
    const react_start_1 = require2("@tanstack/react-start");
    const zod_1 = require2("zod");
    const auth_middleware_1 = require2("@/integrations/supabase/auth-middleware");
    const client_server_1 = require2("@/integrations/supabase/client.server");
    function slugify(s) {
      return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    function generateTempPassword() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      let out = "";
      for (let i = 0; i < 12; i++)
        out += chars[bytes[i] % chars.length];
      return out;
    }
    const EnderecoSchema = zod_1.z.object({
      cep: zod_1.z.string().max(20).optional().default(""),
      logradouro: zod_1.z.string().max(200).optional().default(""),
      numero: zod_1.z.string().max(20).optional().default(""),
      complemento: zod_1.z.string().max(100).optional().default(""),
      bairro: zod_1.z.string().max(100).optional().default(""),
      cidade: zod_1.z.string().max(100).optional().default(""),
      uf: zod_1.z.string().max(2).optional().default("")
    }).partial().default({});
    const BusinessHoursSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.object({
      open: zod_1.z.boolean(),
      from: zod_1.z.string().max(5).optional().default(""),
      to: zod_1.z.string().max(5).optional().default("")
    })).default({});
    const InputSchema = zod_1.z.object({
      // identificação
      name: zod_1.z.string().trim().min(1).max(200),
      nome_fantasia: zod_1.z.string().trim().min(1).max(200),
      cnpj: zod_1.z.string().trim().max(20).optional().default(""),
      logo_url: zod_1.z.string().trim().max(500).optional().default(""),
      // contato
      email_contato: zod_1.z.string().trim().email().max(255),
      telefone_comercial: zod_1.z.string().trim().max(40).optional().default(""),
      whatsapp: zod_1.z.string().trim().max(40).optional().default(""),
      endereco: EnderecoSchema,
      // página pública
      slug: zod_1.z.string().trim().max(80).optional().default(""),
      primary_color: zod_1.z.string().trim().max(20).optional().default("#1B3A4B"),
      // horários
      business_hours: BusinessHoursSchema,
      // plano e cobrança
      plano: zod_1.z.enum(["starter", "pro", "premium"]).default("starter"),
      ciclo: zod_1.z.enum(["mensal", "anual"]).default("mensal"),
      valor_mensal: zod_1.z.number().min(0).max(99999).default(49),
      status_cobranca: zod_1.z.enum(["trial", "ativo", "inadimplente", "suspenso", "cancelado"]).default("trial"),
      trial_ate: zod_1.z.string().trim().max(20).optional().default(""),
      // admin
      nome_admin: zod_1.z.string().trim().max(200).optional().default(""),
      email_admin: zod_1.z.string().trim().email().max(255)
    });
    exports.createBarbershopWithOwner = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => InputSchema.parse(input)).handler(async ({ data, context }) => {
      const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
      if (adminErr)
        throw new Error(adminErr.message);
      if (!isAdmin)
        throw new Error("Apenas super admin pode cadastrar barbearias.");
      const email = data.email_admin.toLowerCase();
      const slug = data.slug || slugify(data.nome_fantasia || data.name);
      const { data: existingSlug } = await client_server_1.supabaseAdmin.from("company").select("id").eq("slug", slug).maybeSingle();
      if (existingSlug)
        throw new Error(`Slug "${slug}" j\xE1 est\xE1 em uso. Escolha outro.`);
      const { data: profile } = await client_server_1.supabaseAdmin.from("profiles").select("user_id").eq("email", email).maybeSingle();
      const userId = profile?.user_id || null;
      const tempPassword = "Entre com sua conta Blink usando este e-mail";
      const { data: company, error: companyErr } = await client_server_1.supabaseAdmin.from("company").insert({
        name: data.name,
        nome_fantasia: data.nome_fantasia,
        cnpj: data.cnpj || null,
        logo_url: data.logo_url || null,
        email_contato: data.email_contato.toLowerCase(),
        telefone_comercial: data.telefone_comercial || null,
        whatsapp: data.whatsapp || null,
        endereco: data.endereco,
        slug,
        primary_color: data.primary_color || "#1B3A4B",
        business_hours: data.business_hours,
        plano: data.plano,
        ciclo: data.ciclo,
        selected_plan_slug: data.plano === "premium" ? "business" : data.plano,
        valor_mensal: data.valor_mensal,
        status_cobranca: data.status_cobranca,
        trial_ate: data.trial_ate || null,
        created_by: userId,
        onboarding_concluido: true,
        onboarding_step: 5
      }).select("id, slug").single();
      if (companyErr)
        throw new Error(companyErr.message);
      const { error: linkErr } = await client_server_1.supabaseAdmin.from("company_user").upsert({
        company_id: company.id,
        user_id: userId,
        email,
        nome: data.nome_admin || data.nome_fantasia || data.name,
        role: "owner",
        ativo: true,
        convite_aceito: true,
        forcar_troca_senha: false
      }, { onConflict: "company_id,email" });
      if (linkErr)
        throw new Error(linkErr.message);
      return {
        companyId: company.id,
        slug: company.slug,
        email,
        tempPassword
      };
    });
    const EmailsSchema = zod_1.z.object({
      emails: zod_1.z.array(zod_1.z.string().trim().email().max(255)).max(50)
    });
    exports.setSuperAdminEmails = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => EmailsSchema.parse(input)).handler(async ({ data, context }) => {
      const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
      if (adminErr)
        throw new Error(adminErr.message);
      if (!isAdmin)
        throw new Error("Apenas super admin pode alterar a lista.");
      const normalized = Array.from(new Set(data.emails.map((e) => e.toLowerCase())));
      const { data: existing } = await client_server_1.supabaseAdmin.from("app_config").select("id").limit(1).maybeSingle();
      if (existing?.id) {
        const { error } = await client_server_1.supabaseAdmin.from("app_config").update({ super_admin_emails: normalized }).eq("id", existing.id);
        if (error)
          throw new Error(error.message);
      } else {
        const { error } = await client_server_1.supabaseAdmin.from("app_config").insert({ app_name: "BarbeiroPro AI", super_admin_emails: normalized });
        if (error)
          throw new Error(error.message);
      }
      if (normalized.length > 0) {
        const allUsers = [];
        let page = 1;
        for (; ; ) {
          const { data: list, error } = await client_server_1.supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (error)
            break;
          allUsers.push(...list?.users ?? []);
          if (!list?.users || list.users.length < 200)
            break;
          page += 1;
          if (page > 25)
            break;
        }
        const promoted = [];
        for (const email of normalized) {
          const user = allUsers.find((u) => (u.email ?? "").toLowerCase() === email);
          if (!user)
            continue;
          await client_server_1.supabaseAdmin.from("user_roles").upsert({ user_id: user.id, role: "super_admin" }, { onConflict: "user_id,role" });
          promoted.push(email);
        }
        return { ok: true, total: normalized.length, promoted };
      }
      return { ok: true, total: 0, promoted: [] };
    });
    const AppBrandSchema = zod_1.z.object({
      app_name: zod_1.z.string().trim().min(1).max(120),
      primary_color: zod_1.z.string().trim().max(20).optional().default("")
    });
    exports.setAppBrand = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => AppBrandSchema.parse(input)).handler(async ({ data, context }) => {
      const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
      if (adminErr)
        throw new Error(adminErr.message);
      if (!isAdmin)
        throw new Error("Apenas super admin pode alterar a marca.");
      const { data: existing } = await client_server_1.supabaseAdmin.from("app_config").select("id, system_settings").limit(1).maybeSingle();
      const newSettings = {
        ...existing?.system_settings ?? {},
        primary_color: data.primary_color || existing?.system_settings?.primary_color || ""
      };
      if (existing?.id) {
        const { error } = await client_server_1.supabaseAdmin.from("app_config").update({ app_name: data.app_name, system_settings: newSettings }).eq("id", existing.id);
        if (error)
          throw new Error(error.message);
      } else {
        const { error } = await client_server_1.supabaseAdmin.from("app_config").insert({ app_name: data.app_name, super_admin_emails: [], system_settings: newSettings });
        if (error)
          throw new Error(error.message);
      }
      return { ok: true };
    });
  },
  "src/lib/users.functions": (module, exports, require2, process) => {
    "use strict";
    var __createBinding = Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    };
    var __importStar = /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.removeTeamMember = exports.resetTeamMemberPassword = exports.setTeamMemberActive = exports.updateTeamMemberRole = exports.createTeamMember = exports.resetAdminPassword = exports.signUpInterno = void 0;
    exports.generateTempPassword = generateTempPassword;
    const react_start_1 = require2("@tanstack/react-start");
    const zod_1 = require2("zod");
    const auth_middleware_1 = require2("@/integrations/supabase/auth-middleware");
    const ROLES = ["owner", "admin", "barbeiro", "recepcao", "financeiro"];
    function generateTempPassword() {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
      const bytes = crypto.getRandomValues(new Uint8Array(12));
      let out = "";
      for (let i = 0; i < 12; i++)
        out += chars[bytes[i] % chars.length];
      return out;
    }
    async function findUserByEmail(admin, email) {
      let page = 1;
      for (; ; ) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error)
          throw new Error(error.message);
        const u = data?.users.find((x) => (x.email ?? "").toLowerCase() === email);
        if (u)
          return u.id;
        if (!data?.users || data.users.length < 200)
          return null;
        page += 1;
        if (page > 25)
          return null;
      }
    }
    const SignUpSchema = zod_1.z.object({
      email: zod_1.z.string().trim().email().max(255),
      password: zod_1.z.string().min(6).max(72),
      nome: zod_1.z.string().trim().max(200).optional().default("")
    });
    const _signupAttempts = /* @__PURE__ */ new Map();
    function checkSignupRate(email) {
      const now = Date.now();
      const windowMs = 10 * 60 * 1e3;
      const list = (_signupAttempts.get(email) ?? []).filter((t) => now - t < windowMs);
      if (list.length >= 5)
        throw new Error("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      list.push(now);
      _signupAttempts.set(email, list);
    }
    exports.signUpInterno = (0, react_start_1.createServerFn)({ method: "POST" }).inputValidator((input) => SignUpSchema.parse(input)).handler(async ({ data }) => {
      const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
      const email = data.email.toLowerCase();
      checkSignupRate(email);
      const existing = await findUserByEmail(supabaseAdmin, email);
      if (existing)
        throw new Error("J\xE1 existe uma conta com este email. Entre com sua senha.");
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { nome: data.nome || "" }
      });
      if (error)
        throw new Error(error.message);
      return { ok: true };
    });
    const ResetAdminSchema = zod_1.z.object({ company_id: zod_1.z.string().uuid() });
    exports.resetAdminPassword = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => ResetAdminSchema.parse(input)).handler(async ({ data, context }) => {
      const { data: isAdmin, error: adminErr } = await context.supabase.rpc("is_super_admin");
      if (adminErr)
        throw new Error(adminErr.message);
      if (!isAdmin)
        throw new Error("Apenas super admin pode resetar senhas.");
      const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
      const { data: owner, error: ownerErr } = await supabaseAdmin.from("company_user").select("id, user_id, email").eq("company_id", data.company_id).eq("role", "owner").eq("ativo", true).order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (ownerErr)
        throw new Error(ownerErr.message);
      if (!owner?.user_id)
        throw new Error("Owner n\xE3o encontrado para esta barbearia.");
      const tempPassword = generateTempPassword();
      const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(owner.user_id, {
        password: tempPassword
      });
      if (upErr)
        throw new Error(upErr.message);
      await supabaseAdmin.from("company_user").update({ forcar_troca_senha: true }).eq("id", owner.id);
      return { email: owner.email, tempPassword };
    });
    async function assertCanManageTeam(context, companyId) {
      const { data: isAdmin } = await context.supabase.rpc("is_super_admin");
      if (isAdmin)
        return;
      const { data: ok, error } = await context.supabase.rpc("has_company_role", {
        _company_id: companyId,
        _roles: ["owner", "admin"]
      });
      if (error)
        throw new Error(error.message);
      if (!ok)
        throw new Error("Sem permiss\xE3o para gerenciar a equipe.");
    }
    const CreateMemberSchema = zod_1.z.object({
      company_id: zod_1.z.string().uuid(),
      email: zod_1.z.string().trim().email().max(255),
      nome: zod_1.z.string().trim().max(200).optional().default(""),
      role: zod_1.z.enum(ROLES),
      password: zod_1.z.string().min(6).max(72).optional(),
      generate_password: zod_1.z.boolean().optional().default(false)
    });
    exports.createTeamMember = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => CreateMemberSchema.parse(input)).handler(async ({ data, context }) => {
      await assertCanManageTeam(context, data.company_id);
      const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
      const email = data.email.toLowerCase();
      const { data: profile } = await supabaseAdmin.from("profiles").select("user_id").eq("email", email).maybeSingle();
      const { error } = await supabaseAdmin.from("company_user").upsert({
        company_id: data.company_id,
        email,
        nome: data.nome,
        role: data.role,
        user_id: profile?.user_id || null,
        ativo: true,
        convite_aceito: !!profile,
        forcar_troca_senha: false
      }, { onConflict: "company_id,email" });
      if (error)
        throw new Error(error.message);
      return { email, password: "Entre com sua conta Blink usando este e-mail", generated: false };
    });
    const UpdateRoleSchema = zod_1.z.object({
      company_id: zod_1.z.string().uuid(),
      member_id: zod_1.z.string().uuid(),
      role: zod_1.z.enum(ROLES)
    });
    exports.updateTeamMemberRole = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => UpdateRoleSchema.parse(input)).handler(async ({ data, context }) => {
      await assertCanManageTeam(context, data.company_id);
      const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
      const { error } = await supabaseAdmin.from("company_user").update({ role: data.role }).eq("id", data.member_id).eq("company_id", data.company_id);
      if (error)
        throw new Error(error.message);
      return { ok: true };
    });
    const SetActiveSchema = zod_1.z.object({
      company_id: zod_1.z.string().uuid(),
      member_id: zod_1.z.string().uuid(),
      ativo: zod_1.z.boolean()
    });
    exports.setTeamMemberActive = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => SetActiveSchema.parse(input)).handler(async ({ data, context }) => {
      await assertCanManageTeam(context, data.company_id);
      const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
      const { error } = await supabaseAdmin.from("company_user").update({ ativo: data.ativo }).eq("id", data.member_id).eq("company_id", data.company_id);
      if (error)
        throw new Error(error.message);
      return { ok: true };
    });
    const ResetMemberSchema = zod_1.z.object({
      company_id: zod_1.z.string().uuid(),
      member_id: zod_1.z.string().uuid(),
      password: zod_1.z.string().min(6).max(72).optional()
    });
    exports.resetTeamMemberPassword = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => ResetMemberSchema.parse(input)).handler(async ({ data, context }) => {
      await assertCanManageTeam(context, data.company_id);
      const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
      const { data: member, error } = await supabaseAdmin.from("company_user").select("id, user_id, email").eq("id", data.member_id).eq("company_id", data.company_id).maybeSingle();
      if (error)
        throw new Error(error.message);
      if (!member?.user_id)
        throw new Error("Membro sem conta vinculada.");
      const password = data.password && data.password.length >= 6 ? data.password : generateTempPassword();
      const wasGenerated = !data.password || data.password.length < 6;
      const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(member.user_id, {
        password
      });
      if (upErr)
        throw new Error(upErr.message);
      await supabaseAdmin.from("company_user").update({ forcar_troca_senha: wasGenerated }).eq("id", member.id);
      return { email: member.email, password, generated: wasGenerated };
    });
    const RemoveMemberSchema = zod_1.z.object({
      company_id: zod_1.z.string().uuid(),
      member_id: zod_1.z.string().uuid()
    });
    exports.removeTeamMember = (0, react_start_1.createServerFn)({ method: "POST" }).middleware([auth_middleware_1.requireSupabaseAuth]).inputValidator((input) => RemoveMemberSchema.parse(input)).handler(async ({ data, context }) => {
      await assertCanManageTeam(context, data.company_id);
      const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
      const { error } = await supabaseAdmin.from("company_user").delete().eq("id", data.member_id).eq("company_id", data.company_id);
      if (error)
        throw new Error(error.message);
      return { ok: true };
    });
  },
  "src/routes/api/public/billing/webhook": (module, exports, require2, process) => {
    "use strict";
    var __createBinding = Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    };
    var __importStar = /* @__PURE__ */ (function() {
      var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function(o2) {
          var ar = [];
          for (var k in o2) if (Object.prototype.hasOwnProperty.call(o2, k)) ar[ar.length] = k;
          return ar;
        };
        return ownKeys(o);
      };
      return function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        }
        __setModuleDefault(result, mod);
        return result;
      };
    })();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Route = void 0;
    const react_router_1 = require2("@tanstack/react-router");
    const normalize_1 = require2("src/lib/billing/normalize");
    const ALLOWED = ["kiwify", "cakto", "perfectpay", "hotmart", "kirvano"];
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-webhook-token"
    };
    function json(status, body) {
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    async function readBody(request) {
      const ct = (request.headers.get("content-type") || "").toLowerCase();
      if (ct.includes("application/json")) {
        try {
          return await request.json();
        } catch {
          return {};
        }
      }
      if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
        try {
          const form = await request.formData();
          const obj = {};
          for (const [k, v] of form.entries()) {
            if (typeof v === "string" && (v.startsWith("{") || v.startsWith("["))) {
              try {
                obj[k] = JSON.parse(v);
                continue;
              } catch {
              }
            }
            obj[k] = v;
          }
          return obj;
        } catch {
          return {};
        }
      }
      try {
        const text = await request.text();
        if (!text)
          return {};
        try {
          return JSON.parse(text);
        } catch {
          return { _raw: text };
        }
      } catch {
        return {};
      }
    }
    exports.Route = (0, react_router_1.createFileRoute)("/api/public/billing/webhook")({
      server: {
        handlers: {
          OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
          POST: async ({ request }) => {
            const url = new URL(request.url);
            const provider = (url.searchParams.get("provider") || "").toLowerCase();
            const tokenQ = url.searchParams.get("token") || "";
            const tokenH = request.headers.get("x-webhook-token") || "";
            const token = tokenQ || tokenH;
            if (!ALLOWED.includes(provider)) {
              return json(400, { ok: false, error: "provider inv\xE1lido" });
            }
            const { supabaseAdmin } = await Promise.resolve().then(() => __importStar(require2("@/integrations/supabase/client.server")));
            const { applyEvent, getWebhookTokenForProvider } = await Promise.resolve().then(() => __importStar(require2("src/lib/billing/apply.server")));
            const expected = await getWebhookTokenForProvider(provider);
            if (!expected || !token || token !== expected) {
              await supabaseAdmin.from("billing_event_log").insert({
                provider,
                event_type: "auth_failed",
                processed: false,
                error: "token inv\xE1lido",
                payload: {}
              });
              return json(401, { ok: false, error: "token inv\xE1lido" });
            }
            const body = await readBody(request);
            try {
              const evt = (0, normalize_1.normalize)(provider, body);
              const result = await applyEvent(evt, body);
              if (!result.ok && result.retry) {
                return json(500, { ok: false, eventType: evt.eventType, error: result.error });
              }
              return json(200, { ok: result.ok, eventType: evt.eventType, error: result.error });
            } catch (err) {
              await supabaseAdmin.from("billing_event_log").insert({
                provider,
                event_type: "exception",
                processed: false,
                error: err?.message ?? String(err),
                payload: body ?? {}
              });
              return json(200, { ok: false, error: err?.message ?? "erro interno" });
            }
          }
        }
      }
    });
  },
  "src/lib/billing/normalize": (module, exports, require2, process) => {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.normalize = normalize;
    function pick(...vals) {
      for (const v of vals) {
        if (v !== void 0 && v !== null && v !== "")
          return v;
      }
      return null;
    }
    function lower(v) {
      if (typeof v !== "string")
        return null;
      const t = v.trim().toLowerCase();
      return t || null;
    }
    function digits(v) {
      if (v == null)
        return null;
      const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
      if (isNaN(n))
        return null;
      return Math.round(n);
    }
    function detectKiwify(name) {
      const n = name.toLowerCase();
      if (/refund/.test(n))
        return "refunded";
      if (/chargeback/.test(n))
        return "chargeback";
      if (/(subscription[_-]?renewed|renewed)/.test(n))
        return "subscription_renewed";
      if (/(subscription[_-]?canceled|canceled|cancelled)/.test(n))
        return "subscription_canceled";
      if (/(order[_-]?approved|paid|approved)/.test(n))
        return "purchase_approved";
      if (/(billet[_-]?overdue|rejected|pix[_-]?expired|expired|overdue|failed)/.test(n))
        return "payment_failed";
      return "unknown";
    }
    function detectCakto(name) {
      const n = name.toLowerCase();
      if (/refund/.test(n))
        return "refunded";
      if (/chargeback/.test(n))
        return "chargeback";
      if (/renewed/.test(n))
        return "subscription_renewed";
      if (/canceled|cancelled/.test(n))
        return "subscription_canceled";
      if (/paid|approved|purchase[_-]?approved/.test(n))
        return "purchase_approved";
      if (/payment[_-]?failed|overdue|failed/.test(n))
        return "payment_failed";
      return "unknown";
    }
    function detectPerfectPay(name, code) {
      const n = name.toLowerCase();
      const c = code != null ? String(code) : "";
      if (n.includes("refund") || c === "7")
        return "refunded";
      if (n.includes("chargeback"))
        return "chargeback";
      if (n.includes("canceled") || n.includes("cancelled"))
        return "subscription_canceled";
      if (n.includes("approved") || c === "2")
        return "purchase_approved";
      if (/fail|expired/.test(n))
        return "payment_failed";
      return "unknown";
    }
    function detectHotmart(name) {
      const n = name.toUpperCase();
      if (n === "PURCHASE_REFUNDED")
        return "refunded";
      if (n === "PURCHASE_CHARGEBACK")
        return "chargeback";
      if (n === "SUBSCRIPTION_CANCELLATION")
        return "subscription_canceled";
      if (n === "PURCHASE_APPROVED" || n === "PURCHASE_COMPLETE")
        return "purchase_approved";
      if (n === "PURCHASE_DELAYED" || n === "PURCHASE_BILLET_PRINTED")
        return "payment_failed";
      if (n.includes("SUBSCRIPTION") || n.includes("RENEW"))
        return "subscription_renewed";
      return "unknown";
    }
    function detectKirvano(name) {
      const n = name.toUpperCase();
      if (n === "SALE_REFUNDED")
        return "refunded";
      if (n === "CHARGEBACK")
        return "chargeback";
      if (n === "SUBSCRIPTION_CANCELED")
        return "subscription_canceled";
      if (n === "SUBSCRIPTION_RENEWED")
        return "subscription_renewed";
      if (n === "SALE_APPROVED" || n === "sale_approved".toUpperCase())
        return "purchase_approved";
      if (/EXPIRED|ABANDONED|PAYMENT_FAILED/.test(n))
        return "payment_failed";
      return "unknown";
    }
    function normalize(provider, body) {
      const b = body ?? {};
      const data = b.data ?? {};
      let rawEventName = "";
      let eventType = "unknown";
      let buyerEmail = null;
      let externalSubscriptionId = null;
      let externalCustomerId = null;
      let productRef = null;
      let amountCents = null;
      let periodEnd = null;
      switch (provider) {
        case "kiwify": {
          rawEventName = String(pick(b.webhook_event_type, b.event, b.order_status, data.event, "") ?? "");
          eventType = detectKiwify(rawEventName);
          buyerEmail = lower(pick(b.Customer?.email, b.customer?.email, b.buyer?.email, data.customer?.email));
          externalSubscriptionId = pick(b.Subscription?.id, b.subscription_id, b.subscription?.id);
          externalCustomerId = pick(b.Customer?.id, b.customer?.id, b.customer_id);
          productRef = String(pick(b.Product?.product_id, b.product_id, b.offer_id, b.Product?.id) ?? "") || null;
          amountCents = digits(pick(b.Commissions?.charge_amount, b.charge_amount, b.amount));
          periodEnd = pick(b.Subscription?.next_payment, b.subscription?.next_payment);
          break;
        }
        case "cakto": {
          rawEventName = String(pick(b.event, b.status, data.status, "") ?? "");
          eventType = detectCakto(rawEventName);
          buyerEmail = lower(pick(data.customer?.email, b.customer?.email, b.email));
          externalSubscriptionId = pick(data.subscription?.id, b.subscription_id);
          externalCustomerId = pick(data.customer?.id, b.customer?.id);
          productRef = String(pick(data.product?.id, b.product?.id, b.offer_id, data.offer_id) ?? "") || null;
          amountCents = digits(pick(data.amount, b.amount, data.price));
          periodEnd = pick(data.subscription?.next_billing, data.next_billing);
          break;
        }
        case "perfectpay": {
          const code = pick(b.sale_status_enum, b.status_code, b.status);
          rawEventName = String(pick(b.sale_status_detail, b.status, b.event, "") ?? "");
          eventType = detectPerfectPay(rawEventName, code);
          buyerEmail = lower(pick(b.customer?.email, b.email, b.payer_email));
          externalSubscriptionId = pick(b.subscription?.code, b.subscription_code, b.code);
          externalCustomerId = pick(b.customer?.id, b.customer_code);
          productRef = String(pick(b.product?.code, b.plan?.code, b.product_code) ?? "") || null;
          amountCents = digits(pick(b.sale_amount, b.amount));
          periodEnd = pick(b.subscription?.next_charge_date, b.next_payment);
          break;
        }
        case "hotmart": {
          rawEventName = String(pick(b.event, b.type, "") ?? "");
          eventType = detectHotmart(rawEventName);
          buyerEmail = lower(pick(data.buyer?.email, b.buyer?.email, data.subscriber?.email));
          externalSubscriptionId = pick(data.subscription?.subscriber?.code, data.subscription?.code);
          externalCustomerId = pick(data.buyer?.ucode, data.buyer?.id);
          productRef = String(pick(data.product?.id, data.product?.ucode, b.product?.id) ?? "") || null;
          amountCents = digits(pick(data.purchase?.price?.value, data.commission?.value));
          periodEnd = pick(data.subscription?.date_next_charge, data.subscription?.end_accession_date);
          break;
        }
        case "kirvano": {
          rawEventName = String(pick(b.event, b.type, "") ?? "");
          eventType = detectKirvano(rawEventName);
          buyerEmail = lower(pick(b.customer?.email, b.email, data.customer?.email));
          externalSubscriptionId = pick(b.subscription?.id, b.subscription_id);
          externalCustomerId = pick(b.customer?.id, b.customer_id);
          productRef = String(pick(b.product_id, b.offer_id, b.plan_id, b.product?.id, b.plan?.id) ?? "") || null;
          amountCents = digits(pick(b.amount, b.total_price, b.value));
          periodEnd = pick(b.subscription?.next_charge_date, b.next_billing_at);
          break;
        }
      }
      return {
        provider,
        eventType,
        rawEventName,
        buyerEmail,
        externalSubscriptionId: externalSubscriptionId ? String(externalSubscriptionId) : null,
        externalCustomerId: externalCustomerId ? String(externalCustomerId) : null,
        productRef,
        amountCents,
        periodEnd: periodEnd ? String(periodEnd) : null
      };
    }
  },
  "src/lib/billing/apply.server": (module, exports, require2, process) => {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.applyEvent = applyEvent;
    exports.getWebhookTokenForProvider = getWebhookTokenForProvider;
    const client_server_1 = require2("@/integrations/supabase/client.server");
    function mapStatus(evt) {
      switch (evt) {
        case "purchase_approved":
        case "subscription_renewed":
          return { sub: "active", company: "ativo" };
        case "subscription_canceled":
          return { sub: "canceled", company: "cancelado" };
        case "refunded":
        case "chargeback":
          return { sub: "canceled", company: "suspenso" };
        case "payment_failed":
          return { sub: "past_due", company: "inadimplente" };
        default:
          return null;
      }
    }
    async function findCompanyByEmail(email) {
      try {
        let page = 1;
        let userId = null;
        for (; ; ) {
          const { data: list, error } = await client_server_1.supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (error)
            break;
          const u = list?.users.find((x) => (x.email ?? "").toLowerCase() === email);
          if (u) {
            userId = u.id;
            break;
          }
          if (!list?.users || list.users.length < 200)
            break;
          page += 1;
          if (page > 25)
            break;
        }
        if (userId) {
          const { data: cu } = await client_server_1.supabaseAdmin.from("company_user").select("company_id").eq("user_id", userId).eq("ativo", true).order("created_at", { ascending: true }).limit(1).maybeSingle();
          if (cu?.company_id)
            return cu.company_id;
        }
      } catch {
      }
      const { data: byContact } = await client_server_1.supabaseAdmin.from("company").select("id").ilike("email_contato", email).limit(1).maybeSingle();
      if (byContact?.id)
        return byContact.id;
      return null;
    }
    async function findPlanByRef(ref) {
      if (!ref)
        return null;
      const { data: bySlug } = await client_server_1.supabaseAdmin.from("plan").select("id, slug").eq("slug", ref).maybeSingle();
      if (bySlug)
        return bySlug;
      const { data: byUrl } = await client_server_1.supabaseAdmin.from("plan").select("id, slug, checkout_url").ilike("checkout_url", `%${ref}%`).limit(1).maybeSingle();
      if (byUrl)
        return byUrl;
      const { data: byPriceIds } = await client_server_1.supabaseAdmin.from("plan").select("id, slug, provider_price_ids").filter("provider_price_ids", "cs", JSON.stringify({ ref })).limit(1).maybeSingle();
      if (byPriceIds)
        return byPriceIds;
      return null;
    }
    async function applyEvent(evt, rawPayload) {
      const baseLog = {
        provider: evt.provider,
        event_type: evt.eventType,
        external_id: evt.externalSubscriptionId,
        buyer_email: evt.buyerEmail,
        payload: rawPayload ?? {}
      };
      if (!evt.buyerEmail) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
          ...baseLog,
          processed: false,
          error: "buyer_email ausente no payload"
        });
        return { ok: true, error: "buyer_email ausente" };
      }
      const companyId = await findCompanyByEmail(evt.buyerEmail);
      if (!companyId) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
          ...baseLog,
          processed: false,
          error: "empresa n\xE3o encontrada para email " + evt.buyerEmail
        });
        return { ok: true, error: "empresa n\xE3o encontrada" };
      }
      if (evt.eventType === "unknown") {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
          ...baseLog,
          matched_company_id: companyId,
          processed: true,
          error: "evento desconhecido: " + evt.rawEventName
        });
        return { ok: true, companyId };
      }
      const status = mapStatus(evt.eventType);
      if (!status) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
          ...baseLog,
          matched_company_id: companyId,
          processed: true
        });
        return { ok: true, companyId };
      }
      const plan = await findPlanByRef(evt.productRef);
      const subPayload = {
        company_id: companyId,
        status: status.sub,
        provider: evt.provider,
        external_subscription_id: evt.externalSubscriptionId,
        external_customer_id: evt.externalCustomerId,
        buyer_email: evt.buyerEmail,
        metadata: { rawEventName: evt.rawEventName }
      };
      if (plan?.id)
        subPayload.plan_id = plan.id;
      if (evt.periodEnd) {
        const d = new Date(evt.periodEnd);
        if (!isNaN(d.getTime()))
          subPayload.current_period_end = d.toISOString();
      }
      if (status.sub === "canceled")
        subPayload.canceled_at = (/* @__PURE__ */ new Date()).toISOString();
      const { error: subErr } = await client_server_1.supabaseAdmin.from("subscription").upsert(subPayload, { onConflict: "company_id" });
      if (subErr) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
          ...baseLog,
          matched_company_id: companyId,
          processed: false,
          error: "subscription upsert: " + subErr.message
        });
        return { ok: false, retry: true, error: subErr.message };
      }
      const companyUpdate = { status_cobranca: status.company };
      if (plan?.slug)
        companyUpdate.selected_plan_slug = plan.slug;
      const { error: cErr } = await client_server_1.supabaseAdmin.from("company").update(companyUpdate).eq("id", companyId);
      if (cErr) {
        await client_server_1.supabaseAdmin.from("billing_event_log").insert({
          ...baseLog,
          matched_company_id: companyId,
          processed: false,
          error: "company update: " + cErr.message
        });
        return { ok: false, retry: true, error: cErr.message };
      }
      await client_server_1.supabaseAdmin.from("billing_event_log").insert({
        ...baseLog,
        matched_company_id: companyId,
        processed: true
      });
      return { ok: true, companyId };
    }
    async function getWebhookTokenForProvider(provider) {
      const { data } = await client_server_1.supabaseAdmin.from("app_config").select("system_settings").limit(1).maybeSingle();
      const tokens = data?.system_settings?.webhook_tokens ?? {};
      return tokens[provider] ?? null;
    }
  }
};
function loadDomain(ctx) {
  const cache = {};
  const external = { "zod": zod_exports };
  function createServerFn() {
    let validate = (x) => x, needsAuth = false;
    const builder = { middleware() {
      needsAuth = true;
      return builder;
    }, inputValidator(fn) {
      validate = fn;
      return builder;
    }, handler(fn) {
      return async (args = {}) => {
        if (needsAuth && !ctx.identity.userId) throw new Error("Autentica\xE7\xE3o necess\xE1ria");
        return fn({ context: { supabase: ctx.scoped, userId: ctx.identity.userId, claims: ctx.identity }, data: validate(args.data), request: ctx.request });
      };
    } };
    return builder;
  }
  const special = { "@tanstack/react-router": { createFileRoute: () => (config) => config }, "@tanstack/react-start": { createServerFn }, "@tanstack/react-start/server": { getRequest: () => ctx.request }, "@/integrations/supabase/auth-middleware": { requireSupabaseAuth: {} }, "@/integrations/supabase/client.server": { supabaseAdmin: ctx.admin }, "@/integrations/supabase/client": { supabase: ctx.scoped }, "@/blink/client": { blink: ctx.blink }, "node:process": { env: ctx.env } };
  function load(id2) {
    if (special[id2]) return special[id2];
    if (external[id2]) return external[id2];
    if (cache[id2]) return cache[id2].exports;
    if (!factories[id2]) throw new Error("M\xF3dulo indispon\xEDvel");
    const module = { exports: {} };
    cache[id2] = module;
    factories[id2](module, module.exports, load, { env: ctx.env });
    return module.exports;
  }
  return load;
}

// server/index.ts
var app = new Hono2();
app.use("*", cors({ origin: "*" }));
app.onError((e, c) => {
  console.error("request failed", e.message);
  return c.json({ error: e.message || "Falha ao processar" }, 400);
});
app.get("/health", async (c) => {
  const ctx = await makeContext(c.req.raw, c.env);
  await ctx.sql.sql("SELECT id FROM plan LIMIT 1");
  return c.json({ ok: true, database: "connected", version: "barbeiropro-native-v1" });
});
app.get("/api/bootstrap", async (c) => {
  const ctx = await makeContext(c.req.raw, c.env), env = c.env;
  return c.json({ configured: !!(env.OWNER_USER_ID || env.OWNER_EMAIL) && env.OWNER_PROJECT_ID === env.BLINK_PROJECT_ID, isSuperAdmin: ctx.identity.master });
});
app.post("/api/query", async (c) => {
  const ctx = await makeContext(c.req.raw, c.env);
  const spec = await c.req.json();
  return c.json(await new Database(ctx.sql, ctx.identity).execute(spec));
});
app.post("/api/public/booking", async (c) => {
  const ctx = await makeContext(c.req.raw, c.env, true);
  return c.json(await publicBooking(ctx, await c.req.json()));
});
app.post("/api/onboarding", async (c) => {
  const ctx = await makeContext(c.req.raw, c.env);
  if (!ctx.identity.userId) return c.json({ error: "Autentica\xE7\xE3o necess\xE1ria" }, 401);
  if (ctx.identity.companyId) return c.json({ id: ctx.identity.companyId });
  const data = external_exports.object({ name: external_exports.string().trim().min(2).max(150), nome_fantasia: external_exports.string().max(150), slug: external_exports.string().regex(/^[a-z0-9-]{2,80}$/), whatsapp: external_exports.string().max(30).optional(), telefone_comercial: external_exports.string().max(30).optional(), plan_slug: external_exports.string().max(60).default("starter") }).parse(await c.req.json());
  const { plan_slug, ...companyData } = data;
  const plan = (await ctx.sql.sql("SELECT slug,trial_days FROM plan WHERE slug=? AND ativo=1", [plan_slug])).rows[0];
  if (!plan) throw new Error("Plano indispon\xEDvel");
  const result = await ctx.admin.from("company").insert({ ...companyData, created_by: ctx.identity.userId, email_contato: ctx.identity.email, onboarding_step: 1, selected_plan_slug: plan.slug, status_cobranca: "trial", trial_ate: new Date(Date.now() + Math.max(0, Number(plan.trial_days ?? 14)) * 864e5).toISOString() }).select("id").single();
  if (result.error) throw new Error(result.error.message);
  return c.json(result.data);
});
app.post("/api/rpc", async (c) => {
  const ctx = await makeContext(c.req.raw, c.env), body = await c.req.json();
  if (!ctx.identity.userId) return c.json({ error: "Autentica\xE7\xE3o necess\xE1ria" }, 401);
  if (!rpcAllowlist[body.module]?.includes(body.name)) return c.json({ error: "Opera\xE7\xE3o inexistente" }, 404);
  return c.json(await loadDomain(ctx)(body.module)[body.name]({ data: body.data }) ?? null);
});
app.post("/api/database-operation", async (c) => {
  const ctx = await makeContext(c.req.raw, c.env);
  if (!ctx.identity.userId) return c.json({ error: "Autentica\xE7\xE3o necess\xE1ria" }, 401);
  const body = await c.req.json();
  return c.json(await ctx.scoped.rpc(body.name, body.args));
});
for (const [route, module] of Object.entries(publicRoutes)) app.all(route, async (c) => {
  const ctx = await makeContext(c.req.raw, c.env, true), config = loadDomain(ctx)(module).Route;
  const handler = config.server?.handlers?.[c.req.method];
  if (!handler) return c.json({ error: "M\xE9todo n\xE3o permitido" }, 405);
  return handler({ request: c.req.raw, params: {} });
});
var index_default = app;
export {
  index_default as default
};
