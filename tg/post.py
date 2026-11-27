"""Posts tg/queue.json items to the Telegram group via the bot. Runs in GitHub Actions.
Results go to tg/state.json (committed back) so the next run skips what's already posted."""
import json, os, time, urllib.request, uuid

TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
API = f"https://api.telegram.org/bot{TOKEN}/"
Q = json.load(open("tg/queue.json", encoding="utf-8"))
try:
    S = json.load(open("tg/state.json", encoding="utf-8"))
except Exception:
    S = {"done": {}, "chats": [], "errors": []}

def call(method, fields=None, files=None):
    if files:
        b = uuid.uuid4().hex
        body = b""
        for k, v in (fields or {}).items():
            body += f'--{b}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
        for k, path in files.items():
            body += f'--{b}\r\nContent-Disposition: form-data; name="{k}"; filename="{os.path.basename(path)}"\r\nContent-Type: video/mp4\r\n\r\n'.encode()
            body += open(path, "rb").read() + b"\r\n"
        body += f"--{b}--\r\n".encode()
        req = urllib.request.Request(API + method, data=body, headers={"Content-Type": f"multipart/form-data; boundary={b}"})
    else:
        req = urllib.request.Request(API + method, data=json.dumps(fields or {}).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        try:
            return json.loads(raw)
        except Exception:
            return {"ok": False, "description": f"HTTP {e.code}: {raw[:300]}"}

# Always refresh the list of chats the bot can see (for finding the group id)
up = call("getUpdates", {"allowed_updates": ["message","channel_post","my_chat_member","chat_member","edited_message"]})
S["updates_seen"] = len(up.get("result", []))
chats = {c["id"]: c for c in S.get("chats", [])}
for u in up.get("result", []):
    for k in ("message", "channel_post", "my_chat_member", "chat_member", "edited_message"):
        c = (u.get(k) or {}).get("chat")
        if c:
            chats[c["id"]] = {"id": c["id"], "title": c.get("title") or c.get("first_name"), "type": c["type"]}
S["chats"] = list(chats.values())
S["bot_ok"] = call("getMe").get("ok", False)

chat = Q.get("chat_id")
if chat:
    limit = Q.get("limit") or 999
    sent = 0
    for it in Q["items"]:
        if it["key"] in S["done"] or sent >= limit:
            continue
        try:
          if it.get("video"):
            r = call("sendVideo", {"chat_id": chat, "caption": it["text"], "width": 1080, "height": 1920, "supports_streaming": "true"}, {"video": it["video"]})
          else:
            r = call("sendMessage", {"chat_id": chat, "text": it["text"], "disable_web_page_preview": True})
        except Exception as ex:
            import traceback
            r = {"ok": False, "description": "EXC " + traceback.format_exc()[-600:]}
        if r.get("ok"):
            S["done"][it["key"]] = r["result"]["message_id"]
            sent += 1
        else:
            S["errors"].append({"key": it["key"], "error": r.get("description")})
            break
        json.dump(S, open("tg/state.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        time.sleep(4)
S["last_run"] = time.strftime("%Y-%m-%d %H:%M:%S")
json.dump(S, open("tg/state.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("chats:", len(S["chats"]), "done:", len(S["done"]), "errors:", S["errors"][-1:] )
