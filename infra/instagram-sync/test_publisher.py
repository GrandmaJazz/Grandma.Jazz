import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.request import Request, urlopen
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('publisher', Path(__file__).with_name('publisher.py'))
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class PublisherTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        p.PRIVATE, p.LIVE, p.SOURCE = (root / n for n in ('private', 'live', 'source'))
        p.PRIVATE.mkdir(); (p.PRIVATE / 'backups').mkdir()
        (p.PRIVATE / 'publisher-secret').write_text('test-secret')
        self.posts = [{'url': f'https://www.instagram.com/creator/p/known{i}/', 'kind': 'photo', 'image': 'images/test.jpg'} for i in range(6)]
        for dest in (p.LIVE, p.SOURCE):
            (dest / 'images').mkdir(parents=True)
            (dest / 'images/test.jpg').write_bytes(b'fixture')
            (dest / 'gallery.json').write_text(json.dumps({'avatar': 'images/test.jpg', 'highlights': [], 'posts': self.posts}))
        self.original = (p.LIVE / 'gallery.json').read_bytes()
        server = p.ThreadingHTTPServer(('127.0.0.1', 0), p.Handler)
        self.addCleanup(server.server_close); self.addCleanup(server.shutdown)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.url = f'http://127.0.0.1:{server.server_port}/instagram-sync-internal/'

    def call(self, route, body=None, auth=True):
        req = Request(self.url + route, data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type':'application/json', **({'Authorization':'Bearer test-secret'} if auth else {})})
        try:
            with urlopen(req) as r: return r.status, json.load(r)
        except HTTPError as r: return r.code, json.load(r)

    def lease(self): return self.call('lock', {})[1]['lease']
    def intact(self): self.assertEqual((p.LIVE / 'gallery.json').read_bytes(), self.original)

    def test_unauthorized_before_lock(self):
        self.assertEqual(self.call('lock', {}, False)[0], 401)
        self.assertFalse((p.PRIVATE / 'status.json').exists()); self.intact()

    def test_overlapping_and_expired_invocations(self):
        lease = self.lease(); self.assertEqual(self.call('lock', {})[0], 409)
        s = p.read(p.PRIVATE/'status.json'); s['lockExpires'] = 0; p.save_state(s)
        self.lease()
        self.assertEqual(self.call('commit', {'lease':lease, 'posts':self.posts})[0], 409); self.intact()

    def test_expired_login_records_failure_and_preserves_gallery(self):
        lease = self.lease(); self.assertEqual(self.call('session', {'lease':lease})[0], 428)
        self.call('release', {'lease':lease, 'failure':'authentication_required'})
        status = self.call('status')[1]
        self.assertEqual(status['consecutiveFailures'],1); self.assertFalse(status['authenticationConfigured']); self.intact()

    def test_empty_partial_and_missing_image_never_publish(self):
        lease = self.lease()
        for posts in ([], self.posts[:2], [{**self.posts[0], 'image':'images/missing.jpg'}, *self.posts[1:]]):
            self.assertEqual(self.call('commit', {'lease':lease, 'posts':posts})[0],400); self.intact()

    def test_path_traversal_and_invalid_image_rejected(self):
        lease = self.lease()
        self.assertEqual(self.call('commit', {'lease':lease,'posts':[{**self.posts[0],'image':'images/../../secret.jpg'},*self.posts[1:]]})[0],400)
        self.assertEqual(self.call('image', {'lease':lease,'data':'PHNjcmlwdD4=','mime':'image/jpeg'})[0],400); self.intact()

    def test_merge_and_subsequent_deduplication_keep_archive(self):
        new = {**self.posts[0], 'url':'https://www.instagram.com/collaborator/reel/new123/', 'kind':'reel'}
        lease = self.lease(); status, result = self.call('commit', {'lease':lease,'posts':[new,*self.posts[:3]]})
        self.assertEqual(status,200); self.assertEqual(result['addedPosts'],1)
        self.assertEqual(len(p.read(p.LIVE/'gallery.json')['posts']),7)
        self.call('release',{'lease':lease}); lease = self.lease()
        self.assertEqual(self.call('commit',{'lease':lease,'posts':[new,*self.posts[:3]]})[1]['addedPosts'],0)
        self.assertEqual((p.LIVE/'gallery.json').read_bytes(),(p.SOURCE/'gallery.json').read_bytes())

    def test_pinned_posts_cannot_prove_overlap(self):
        with self.assertRaises(ValueError): p.merge({'avatar':'images/test.jpg','posts':[{**x,'pinned':True} for x in self.posts]}, self.posts)
        self.intact()

    def test_interrupted_publication_recovers_source_from_live(self):
        lease = self.lease(); original_atomic = p.atomic
        def interrupt(path, data):
            if path == p.SOURCE/'gallery.json': raise OSError('simulated interruption')
            return original_atomic(path,data)
        new = {**self.posts[0], 'url':'https://www.instagram.com/p/new123/'}
        with patch.object(p,'atomic',interrupt):
            self.assertEqual(self.call('commit',{'lease':lease,'posts':[new,*self.posts[:3]]})[0],400)
        self.assertEqual(len(p.read(p.LIVE/'gallery.json')['posts']),7)
        self.call('status')
        self.assertEqual((p.LIVE/'gallery.json').read_bytes(),(p.SOURCE/'gallery.json').read_bytes())
        self.assertEqual(len(list((p.PRIVATE/'backups').glob('*.json'))),1)

if __name__ == '__main__': unittest.main()
