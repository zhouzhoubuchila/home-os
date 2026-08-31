const MAX_FEED_BYTES = 1024 * 1024;
const ACCEPT_HEADER =
  'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9';
const USER_AGENT = 'Navet RSS Reader/1.0';
const XML_CONTENT_TYPE_PATTERN = /(?:^|[/+])(rss|atom|xml)(?:[;+]|$)|^text\/xml(?:[;+]|$)/i;
const PRIVATE_HOSTNAMES = {
  localhost: true,
  'localhost.': true,
  '0.0.0.0': true,
};
const HTTPS_URL_PATTERN = /^https:\/\/(?:[^/?#@]+@)?(\[[^\]]+\]|[^/?#:]+)(?::[0-9]+)?(?:[/?#]|$)/i;

function sendJson(r, statusCode, payload) {
  r.headersOut['Cache-Control'] = 'no-store';
  r.headersOut['Content-Type'] = 'application/json; charset=utf-8';
  r.return(statusCode, JSON.stringify(payload));
}

function isPrivateIpAddress(address) {
  const normalizedAddress = address.toLowerCase();
  if (normalizedAddress === '::1' || normalizedAddress === '::') {
    return true;
  }

  if (
    normalizedAddress.indexOf('fc') === 0 ||
    normalizedAddress.indexOf('fd') === 0 ||
    normalizedAddress.indexOf('fe80:') === 0
  ) {
    return true;
  }

  const parts = normalizedAddress.split('.').map(function (part) {
    return Number(part);
  });
  if (
    parts.length !== 4 ||
    parts.some(function (part) {
      return !Number.isInteger(part) || part < 0 || part > 255;
    })
  ) {
    return false;
  }

  const first = parts[0];
  const second = parts[1];
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedHostname(hostname) {
  const normalizedHostname = hostname.toLowerCase();
  return (
    PRIVATE_HOSTNAMES[normalizedHostname] ||
    normalizedHostname.slice(-6) === '.local' ||
    isPrivateIpAddress(normalizedHostname)
  );
}

function decodeQueryValue(value) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch (error) {
    return value;
  }
}

function getRawQueryString(r) {
  return typeof r.variables.args === 'string' ? r.variables.args : '';
}

function getTargetUrlFromRawQuery(r) {
  const query = getRawQueryString(r);
  if (!query) {
    return '';
  }

  const pairs = query.split('&');
  for (let i = 0; i < pairs.length; i += 1) {
    const pair = pairs[i];
    const separatorIndex = pair.indexOf('=');
    const rawKey = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
    if (decodeQueryValue(rawKey) !== 'url') {
      continue;
    }

    const rawValue = separatorIndex === -1 ? '' : pair.slice(separatorIndex + 1);
    return decodeQueryValue(rawValue).trim();
  }

  return '';
}

function getTargetUrl(r) {
  let targetUrl = typeof r.args.url === 'string' ? r.args.url.trim() : '';
  if (!targetUrl) {
    targetUrl = getTargetUrlFromRawQuery(r);
  }

  if (targetUrl.indexOf('https%3A') === 0 || targetUrl.indexOf('https%3a') === 0) {
    targetUrl = decodeQueryValue(targetUrl).trim();
  }

  return targetUrl;
}

function getHttpsHostname(targetUrl) {
  const match = HTTPS_URL_PATTERN.exec(targetUrl);
  if (!match) {
    return null;
  }

  return match[1].replace(/^\[/, '').replace(/\]$/, '');
}

async function handle(r) {
  const targetUrl = getTargetUrl(r);

  if (!targetUrl) {
    sendJson(r, 400, { error: 'Missing url query parameter' });
    return;
  }

  if (targetUrl.indexOf('https://') !== 0) {
    sendJson(r, 400, { error: 'Only HTTPS feeds are allowed' });
    return;
  }

  const hostname = getHttpsHostname(targetUrl);
  if (!hostname) {
    sendJson(r, 400, { error: 'Invalid feed URL' });
    return;
  }

  if (isBlockedHostname(hostname)) {
    sendJson(r, 400, { error: 'Private feed hosts are not allowed' });
    return;
  }

  try {
    const response = await ngx.fetch(targetUrl, {
      headers: {
        Accept: ACCEPT_HEADER,
        'User-Agent': USER_AGENT,
      },
      max_response_body_size: MAX_FEED_BYTES,
    });

    if (!response.ok) {
      sendJson(r, 502, {
        error: 'Upstream feed request failed with status ' + response.status,
      });
      return;
    }

    const contentType = response.headers.get('Content-Type');
    if (!contentType || !XML_CONTENT_TYPE_PATTERN.test(contentType)) {
      sendJson(r, 502, { error: 'Upstream feed returned an unsupported content type' });
      return;
    }

    const contentLength = Number(response.headers.get('Content-Length') || '0');
    if (contentLength > MAX_FEED_BYTES) {
      sendJson(r, 502, { error: 'Upstream feed is too large' });
      return;
    }

    const body = await response.text();
    if (body.length > MAX_FEED_BYTES) {
      sendJson(r, 502, { error: 'Upstream feed is too large' });
      return;
    }

    r.headersOut['Cache-Control'] = 'no-store';
    r.headersOut['X-Content-Type-Options'] = 'nosniff';
    r.headersOut['Referrer-Policy'] = 'strict-origin-when-cross-origin';
    r.headersOut['Content-Type'] = contentType;
    r.return(200, body);
  } catch (error) {
    sendJson(r, 502, { error: 'Unable to load feed' });
  }
}

export default { handle: handle };
