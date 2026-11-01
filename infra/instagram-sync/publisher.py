"""Private, gallery-scoped publisher. No shell execution or arbitrary upload paths."""
import base64
import fcntl
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import smtplib
import ssl
import time
from email.message import EmailMessage
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PRIVATE = Path(os.environ.get('IG_SYNC_PRIVATE', '/var/lib/grandmajazz-instagram-sync'))
SOURCE = Path(os.environ.get('IG_SYNC_SOURCE', '/home/Bradfran/grandmajazz-events/client/public/instagram-gallery'))
LIVE = Path(os.environ.get('IG_SYNC_LIVE', '/home/Bradfran/grandmajazz-events/dist/public/instagram-gallery'))
POST = re.compile(r'^https://www\.instagram\.com/(?:[A-Za-z0-9_.]+/)?(?:p|reel)/([A-Za-z0-9_-]{5,64})/$')
IMAGE = re.compile(r'^images/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$')
FAILURES = {'authentication_required', 'access_restricted', 'empty_scan', 'partial_scan', 'image_download', 'deadline', 'collector_failed', 'publisher_failed'}

def now():
    return datetime.now(timezone.utc).isoformat()

def atomic(path, data):
    tmp = path.with_name(path.name + '.' + secrets.token_hex(8) + '.tmp')
    try:
        with tmp.open('xb') as f:
            f.write(data); f.flush(); os.fsync(f.fileno())
        os.replace(tmp, path)
        fd = os.open(str(path.parent), os.O_DIRECTORY)
        try: os.fsync(fd)
        finally: os.close(fd)
    finally:
        tmp.unlink(missing_ok=True)

def read(path, fallback=None):
    return json.loads(path.read_text()) if path.exists() else fallback

def save_state(s):
    atomic(PRIVATE / 'status.json', json.dumps(s).encode())

def notify(s, test=False):
    config = read(PRIVATE / 'notification.json')
    if not config:
        s['alertDelivery'] = 'not_configured'
        return
    category = s.get('failureCategory', 'none')
    if not test and s.get('lastAlertCategory') == category and time.time() - s.get('lastAlertEpoch', 0) < 86400:
        return
    message = EmailMessage()
    message['From'] = config['smtpUser']
    message['To'] = config['recipient']
    message['Subject'] = 'Grandma Jazz Instagram sync — ' + ('alert delivery test' if test else 'attention needed')
    message.set_content(
        ('This is the requested Instagram sync alert delivery test.\n' if test else 'The Instagram sync worker needs attention.\n') +
        f'Failure category: {category}\nConsecutive failures: {s.get("consecutiveFailures", 0)}\n' +
        f'Last successful check: {s.get("lastSuccessfulCheck", "not yet completed")}\n' +
        'The existing gallery remains available at https://www.grandmajazz.com/instagram/ .\n' +
        'A browser packaging probe is not a successful Instagram sync. Check private status for authentication and schedule readiness.\n'
    )
    try:
        with smtplib.SMTP_SSL(config['smtpHost'], int(config['smtpPort']), timeout=12, context=ssl.create_default_context()) as smtp:
            smtp.login(config['smtpUser'], config['smtpPassword'])
            smtp.send_message(message)
        s.update(alertDelivery='accepted_by_smtp', lastAlertAt=now())
        if not test: s.update(lastAlertCategory=category, lastAlertEpoch=time.time())
    except (OSError, smtplib.SMTPException):
        s.update(alertDelivery='failed', lastAlertFailureAt=now())

def shortcode(p):
    m = POST.fullmatch(p.get('url', ''))
    if not m: raise ValueError('invalid_post_url')
    return m[1]

def validate_asset(path):
    if not isinstance(path, str) or not IMAGE.fullmatch(path): raise ValueError('invalid_image_path')
    for root in (LIVE, SOURCE):
        f = root / path
        if f.is_symlink() or not f.is_file(): raise ValueError('missing_image')

def merge(old, observed):
    if not observed or len(observed) > 600: raise ValueError('empty_or_large_scan')
    known = {shortcode(p): p for p in old['posts']}
    codes = [shortcode(p) for p in observed]
    if len(codes) != len(set(codes)): raise ValueError('duplicate_observation')
    # Three consecutive non-pinned known posts anchor the newest scan. Pinned
    # entries cannot satisfy this overlap, even if no longer marked in the DOM.
    run = 0
    overlap = False
    for p in observed:
        code = shortcode(p)
        if p.get('pinned') or known.get(code, {}).get('pinned'): continue
        run = run + 1 if code in known else 0
        overlap = overlap or run >= 3
    if not overlap: raise ValueError('unverified_overlap')
    for p in observed:
        if p.get('kind') not in ('photo', 'reel'): raise ValueError('invalid_kind')
        if not isinstance(p.get('caption', ''), str) or len(p.get('caption', '')) > 10000: raise ValueError('invalid_caption')
        validate_asset(p.get('image'))
    # Stable merge around observed anchors, retaining every unobserved archive
    # entry. No removal reconciliation is performed by this newest-grid scan.
    posts = list(old['posts'])
    for p in reversed(observed):
        code = shortcode(p)
        if code in known: continue
        following = codes[codes.index(code) + 1:]
        next_code = next((c for c in following if any(shortcode(x) == c for x in posts)), None)
        at = next((i for i, x in enumerate(posts) if shortcode(x) == next_code), 0)
        posts.insert(at, p)
    # Existing canonical URLs/captions remain intact; only observed image/pin
    # metadata is refreshed. All referenced assets must exist before committing.
    updates = {shortcode(p): p for p in observed}
    posts = [{**p, **{k: updates[shortcode(p)][k] for k in ('image', 'pinned') if k in updates.get(shortcode(p), {})}} for p in posts]
    result = {**old, 'posts': posts}
    for p in posts: validate_asset(p['image'])
    validate_asset(result['avatar'])
    for h in result.get('highlights', []): validate_asset(h['image'])
    return result, len(posts) - len(old['posts'])

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass  # Request bodies, headers and sessions never enter logs.

    def reply(self, code, value):
        data = json.dumps(value).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers(); self.wfile.write(data)

    def do_GET(self): self.handle_request()
    def do_POST(self): self.handle_request()

    def handle_request(self):
        self.connection.settimeout(15)
        token = (PRIVATE / 'publisher-secret').read_text().strip()
        if not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
            return self.reply(401, {'error': 'unauthorized'})
        route = self.path.removeprefix('/instagram-sync-internal/')
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size < 0 or size > 5_800_000: return self.reply(413, {'error': 'body_limit'})
            if self.command == 'POST' and self.headers.get('Content-Type') != 'application/json':
                return self.reply(415, {'error': 'json_required'})
            body = json.loads(self.rfile.read(size)) if size else {}
            with (PRIVATE / 'transaction.lock').open('a') as guard:
                fcntl.flock(guard, fcntl.LOCK_EX)
                # Live manifest is the commit point. Repair the build archive if
                # a process stopped between the two atomic replacements.
                if (LIVE / 'gallery.json').read_bytes() != (SOURCE / 'gallery.json').read_bytes():
                    atomic(SOURCE / 'gallery.json', (LIVE / 'gallery.json').read_bytes())
                s = read(PRIVATE / 'status.json', {'consecutiveFailures': 0})
                if self.command == 'GET' and route == 'status':
                    return self.reply(200, {**{k:v for k,v in s.items() if k != 'lockHash'}, 'authenticationConfigured': (PRIVATE / 'worker-session.json').is_file()})
                if self.command == 'POST' and route == 'lock':
                    if s.get('lockExpires', 0) > time.time(): return self.reply(409, {'error': 'locked'})
                    lease = secrets.token_urlsafe(32)
                    s.update(lockHash=hashlib.sha256(lease.encode()).hexdigest(), lockExpires=time.time() + 285, lastAttempt=now())
                    save_state(s)
                    return self.reply(200, {'lease': lease, 'manifest': read(LIVE / 'gallery.json')})
                lease = body.get('lease', '')
                valid = isinstance(lease, str) and hmac.compare_digest(s.get('lockHash', ''), hashlib.sha256(lease.encode()).hexdigest()) and s.get('lockExpires', 0) > time.time()
                if not valid: return self.reply(409, {'error': 'lease_expired'})
                if self.command == 'POST' and route == 'session':
                    p = PRIVATE / 'worker-session.json'
                    if not p.is_file(): return self.reply(428, {'error': 'authentication_required'})
                    return self.reply(200, {'storageState': read(p)})
                if self.command == 'POST' and route == 'image':
                    data = base64.b64decode(body['data'], validate=True)
                    if len(data) > 4_000_000 or len(data) < 32: raise ValueError('image_size')
                    ext = 'jpg' if data.startswith(b'\xff\xd8\xff') else 'png' if data.startswith(b'\x89PNG\r\n\x1a\n') else 'webp' if data[:4] == b'RIFF' and data[8:12] == b'WEBP' else None
                    if not ext or body.get('mime') != {'jpg': 'image/jpeg', 'png': 'image/png', 'webp': 'image/webp'}[ext]: raise ValueError('image_type')
                    image = 'images/sync-' + hashlib.sha256(data).hexdigest() + '.' + ext
                    for root in (SOURCE, LIVE):
                        path = root / image
                        if path.is_symlink(): raise ValueError('invalid_image_path')
                        if not path.exists(): atomic(path, data)
                    return self.reply(200, {'image': image})
                if self.command == 'POST' and route == 'commit':
                    old = read(LIVE / 'gallery.json')
                    merged, added = merge(old, body['posts'])
                    payload = json.dumps(merged, ensure_ascii=False, indent=2).encode()
                    changed = merged != old
                    if changed:
                        backup = PRIVATE / 'backups' / (str(time.time_ns()) + '.json')
                        atomic(backup, (LIVE / 'gallery.json').read_bytes())
                        atomic(LIVE / 'gallery.json', payload)
                        atomic(SOURCE / 'gallery.json', payload)
                        s['lastPublication'] = now()
                    s.update(lastSuccessfulCheck=now(), observedPosts=len(body['posts']), addedPosts=added, failureCategory=None, consecutiveFailures=0, published=changed)
                    if added: s['lastNewPost'] = now()
                    save_state(s)
                    return self.reply(200, {k: v for k, v in s.items() if k != 'lockHash'})
                if self.command == 'POST' and route == 'release':
                    failure = body.get('failure')
                    if failure:
                        if failure not in FAILURES: raise ValueError('invalid_failure')
                        s.update(failureCategory=failure, consecutiveFailures=s.get('consecutiveFailures', 0) + 1, lastFailure=now())
                    s.pop('lockHash', None); s.pop('lockExpires', None)
                    save_state(s)
                    if failure:
                        notify(s)
                        save_state(s)
                    return self.reply(200, {'released': True})
                return self.reply(404, {'error': 'not_found'})
        except (ValueError, KeyError, TypeError, OSError):
            return self.reply(400, {'error': 'invalid_request'})

if __name__ == '__main__':
    os.umask(0o077)
    PRIVATE.mkdir(parents=True, exist_ok=True)
    (PRIVATE / 'backups').mkdir(exist_ok=True)
    ThreadingHTTPServer(('127.0.0.1', 5021), Handler).serve_forever()
