import json
import os
import secrets
import string

import boto3
from botocore.exceptions import ClientError

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])

ALPHABET = string.ascii_letters + string.digits  # base62
CODE_LENGTH = 7  # set to whatever length you're using

# The frontend, served on GET /. Raw string so the JS regex backslashes survive.
# The fetch is relative ("/"), so the page works on whatever domain serves it.
HTML_PAGE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>s.nasir.id — link shortener</title>
<style>
  :root {
    --bg: #f1f3f6; --surface: #fff; --ink: #15171c; --muted: #6a707b;
    --line: #e0e4ea; --accent: #2742e4; --accent-tint: #eef1fe;
    --ok: #15784a; --danger: #c0392f;
    --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink);
    font-family: var(--sans); -webkit-font-smoothing: antialiased;
    display: flex; justify-content: center; align-items: flex-start;
    padding: 8vh 20px 40px;
  }
  .tool { width: 100%; max-width: 520px; }
  .brand {
    display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono);
    font-size: 12px; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 22px;
  }
  .brand .dot {
    width: 7px; height: 7px; border-radius: 50%; background: var(--ok);
    box-shadow: 0 0 0 3px rgba(21,120,74,0.12);
  }
  h1 { font-size: 30px; line-height: 1.1; letter-spacing: -0.025em; font-weight: 650; margin: 0 0 8px; }
  .lede { margin: 0 0 28px; color: var(--muted); font-size: 15px; line-height: 1.5; }
  .field {
    display: flex; gap: 8px; background: var(--surface); border: 1px solid var(--line);
    border-radius: 12px; padding: 8px; box-shadow: 0 1px 2px rgba(20,23,30,0.04);
    transition: border-color 120ms ease, box-shadow 120ms ease;
  }
  .field:focus-within { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(39,66,228,0.12); }
  #url {
    flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
    font-family: var(--mono); font-size: 14px; color: var(--ink); padding: 10px 8px 10px 10px;
  }
  #url::placeholder { color: #aab0ba; }
  button { font-family: var(--sans); cursor: pointer; border: 0; border-radius: 8px; }
  #go {
    background: var(--accent); color: #fff; font-size: 14px; font-weight: 560;
    padding: 0 18px; white-space: nowrap; transition: background 120ms ease, opacity 120ms ease;
  }
  #go:hover { background: #2036c4; }
  #go:disabled { opacity: 0.55; cursor: default; }
  #go:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .error { margin-top: 14px; color: var(--danger); font-size: 13.5px; }
  .result {
    margin-top: 18px; background: var(--surface); border: 1px solid var(--line);
    border-left: 3px solid var(--accent); border-radius: 10px; padding: 16px 16px 14px;
  }
  .result.enter { animation: rise 240ms cubic-bezier(0.2,0.7,0.2,1); }
  @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .result-row { display: flex; align-items: center; gap: 12px; }
  .short {
    flex: 1; min-width: 0; font-family: var(--mono); font-size: 16px; color: var(--accent);
    word-break: break-all; text-decoration: none;
  }
  .short:hover { text-decoration: underline; }
  .copy {
    background: var(--accent-tint); color: var(--accent); font-size: 12.5px; font-weight: 560;
    padding: 7px 12px; white-space: nowrap; transition: background 120ms ease;
  }
  .copy:hover { background: #e2e8ff; }
  .copy.done { background: rgba(21,120,74,0.12); color: var(--ok); }
  .copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .origin {
    margin-top: 10px; font-size: 12.5px; color: var(--muted); font-family: var(--mono);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .log { margin-top: 36px; }
  .log h2 {
    font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted);
    font-weight: 600; margin: 0 0 12px; padding-bottom: 10px; border-bottom: 1px solid var(--line);
  }
  #history { list-style: none; margin: 0; padding: 0; }
  #history li {
    display: flex; align-items: center; gap: 10px; padding: 9px 0;
    border-bottom: 1px solid var(--line); font-family: var(--mono); font-size: 13px;
  }
  #history .h-code { color: var(--accent); text-decoration: none; }
  #history .h-code:hover { text-decoration: underline; }
  #history .h-arrow { color: #b9bfc9; }
  #history .h-long {
    flex: 1; min-width: 0; color: var(--muted);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  #history .h-copy { background: transparent; color: var(--muted); font-family: var(--sans); font-size: 12px; padding: 4px 8px; }
  #history .h-copy:hover { color: var(--accent); }
  #history .h-copy.done { color: var(--ok); }
  .empty { color: var(--muted); font-size: 13.5px; margin: 0; }
  @media (prefers-reduced-motion: reduce) { .result.enter { animation: none; } }
  @media (max-width: 480px) {
    h1 { font-size: 26px; }
    .field { flex-direction: column; }
    #go { padding: 12px; }
  }
</style>
</head>
<body>
  <main class="tool">
    <div class="brand"><span class="dot"></span>s.nasir.id</div>
    <h1>Shorten a link.</h1>
    <p class="lede">Paste a long URL. Get a short one on your own domain.</p>
    <div class="field">
      <input id="url" type="url" inputmode="url" autocomplete="off"
             spellcheck="false" placeholder="https://example.com/a/very/long/path" />
      <button id="go">Shorten</button>
    </div>
    <div id="error" class="error" role="alert" hidden></div>
    <div id="result" class="result" aria-live="polite" hidden></div>
    <section class="log">
      <h2>This session</h2>
      <ul id="history"></ul>
      <p id="empty" class="empty">Links you create appear here.</p>
    </section>
  </main>
<script>
  const urlInput = document.getElementById("url");
  const goBtn = document.getElementById("go");
  const errorBox = document.getElementById("error");
  const resultBox = document.getElementById("result");
  const historyList = document.getElementById("history");
  const emptyNote = document.getElementById("empty");

  function normalize(raw) {
    let v = raw.trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    try {
      const u = new URL(v);
      if (!u.hostname.includes(".")) return null;
      return u.href;
    } catch { return null; }
  }
  function showError(msg) { errorBox.textContent = msg; errorBox.hidden = false; }
  function clearError() { errorBox.hidden = true; }

  async function copy(text, btn, doneLabel) {
    try {
      await navigator.clipboard.writeText(text);
      const prev = btn.textContent;
      btn.textContent = doneLabel || "Copied";
      btn.classList.add("done");
      setTimeout(() => { btn.textContent = prev; btn.classList.remove("done"); }, 1500);
    } catch { showError("Couldn't copy to clipboard."); }
  }

  function renderResult(shortUrl, longUrl) {
    resultBox.innerHTML = "";
    const row = document.createElement("div");
    row.className = "result-row";
    const link = document.createElement("a");
    link.className = "short"; link.href = shortUrl; link.target = "_blank";
    link.rel = "noopener"; link.textContent = shortUrl;
    const btn = document.createElement("button");
    btn.className = "copy"; btn.textContent = "Copy";
    btn.addEventListener("click", () => copy(shortUrl, btn));
    row.appendChild(link); row.appendChild(btn);
    const origin = document.createElement("div");
    origin.className = "origin"; origin.textContent = longUrl;
    resultBox.appendChild(row); resultBox.appendChild(origin);
    resultBox.hidden = false; resultBox.classList.remove("enter");
    void resultBox.offsetWidth; resultBox.classList.add("enter");
  }

  function addHistory(shortUrl, longUrl) {
    emptyNote.hidden = true;
    const code = shortUrl.split("/").pop();
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "h-code"; a.href = shortUrl; a.target = "_blank";
    a.rel = "noopener"; a.textContent = "/" + code;
    const arrow = document.createElement("span");
    arrow.className = "h-arrow"; arrow.textContent = "\u2192";
    const long = document.createElement("span");
    long.className = "h-long"; long.textContent = longUrl; long.title = longUrl;
    const c = document.createElement("button");
    c.className = "h-copy"; c.textContent = "copy";
    c.addEventListener("click", () => copy(shortUrl, c, "copied"));
    li.appendChild(a); li.appendChild(arrow); li.appendChild(long); li.appendChild(c);
    historyList.prepend(li);
  }

  async function shorten() {
    clearError();
    const longUrl = normalize(urlInput.value);
    if (!longUrl) {
      showError("That doesn't look like a URL. Try something like example.com/page.");
      return;
    }
    goBtn.disabled = true; goBtn.textContent = "Shortening\u2026";
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: longUrl }),
      });
      if (!res.ok) { showError("The service rejected that (" + res.status + "). Try again."); return; }
      const data = await res.json();
      const shortUrl = (data.shortUrl && data.shortUrl.indexOf("http") === 0)
        ? data.shortUrl
        : location.origin + "/" + data.shortCode;
      renderResult(shortUrl, longUrl);
      addHistory(shortUrl, longUrl);
      urlInput.value = "";
    } catch {
      showError("Couldn't reach the service. Check your connection and try again.");
    } finally {
      goBtn.disabled = false; goBtn.textContent = "Shorten";
    }
  }

  goBtn.addEventListener("click", shorten);
  urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") shorten(); });
  urlInput.focus();
</script>
</body>
</html>
"""


def _json(status, body=None, headers=None):
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    return {"statusCode": status, "headers": h,
            "body": json.dumps(body) if body is not None else ""}


def _html(status, html):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "text/html; charset=utf-8"},
        "body": html,
    }


def create_short_url(event):
    try:
        payload = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _json(400, {"error": "Invalid JSON body"})

    long_url = payload.get("url")
    if not long_url:
        return _json(400, {"error": "Missing 'url' field"})

    for _ in range(5):  # retry on the rare collision
        code = "".join(secrets.choice(ALPHABET) for _ in range(CODE_LENGTH))
        try:
            table.put_item(
                Item={"shortCode": code, "longUrl": long_url},
                ConditionExpression="attribute_not_exists(shortCode)",
            )
            base = os.environ.get("BASE_URL", "")
            return _json(201, {
                "shortCode": code,
                "shortUrl": f"{base}/{code}" if base else code,
                "longUrl": long_url,
            })
        except ClientError as e:
            if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
                continue
            raise
    return _json(500, {"error": "Could not generate a unique code"})


def redirect(code):
    item = table.get_item(Key={"shortCode": code}).get("Item")
    if not item:
        return _json(404, {"error": "Short code not found"})
    return _json(301, headers={"Location": item["longUrl"]})


def lambda_handler(event, context):
    method = event.get("httpMethod", "")

    if method == "POST":
        return create_short_url(event)

    if method == "GET":
        code = (event.get("pathParameters") or {}).get("code")
        if code:
            return redirect(code)
        return _html(200, HTML_PAGE)  # GET / -> the form

    return _json(405, {"error": "Method not allowed"})