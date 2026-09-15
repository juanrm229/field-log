"""Offline contract tests: real routes and adapter, mocked remote HTTP only."""
import copy
import json
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

os.environ['STUDIO_PASSWORD'] = 'test-only-password'
os.environ['SUPABASE_URL'] = 'https://test-project.supabase.co'
os.environ['SUPABASE_SECRET_KEY'] = 'sb_secret_test-only'
from backend import server, store


class MigrationTests(unittest.TestCase):
    def setUp(self):
        self.rows = {}
        self.objects = {}
        self.calls = []
        real_client = httpx.AsyncClient
        transport = httpx.MockTransport(self.remote)
        self.stub = patch.object(store.httpx, 'AsyncClient', side_effect=lambda **kw: real_client(transport=transport, **kw))
        self.stub.start()
        self.client = TestClient(server.app)
        self.auth = {'X-Studio-Key': 'test-only-password'}

    def tearDown(self):
        self.stub.stop()

    def remote(self, req):
        self.calls.append(req)
        self.assertEqual(req.headers['apikey'], 'sb_secret_test-only')
        body = json.loads(req.content) if req.content else {}
        path = req.url.path
        if path == '/rest/v1/field_log_records':
            if req.method == 'POST':
                self.rows[(body['collection'], body['record_key'])] = body['document']
                return httpx.Response(201)
            collection = req.url.params['collection'][3:]
            if req.method == 'GET':
                rows = [copy.deepcopy(d) for (c, _), d in sorted(self.rows.items()) if c == collection]
                offset = int(req.url.params.get('offset', 0))
                limit = int(req.url.params.get('limit', 500))
                return httpx.Response(200, json=[{'document': d} for d in rows[offset:offset+limit]])
            key = (collection, req.url.params['record_key'][3:])
            old = self.rows.pop(key, None)
            return httpx.Response(200, json=[old] if old else [])
        if path.endswith('/rpc/field_log_patch'):
            key = (body['p_collection'], body['p_key'])
            if key not in self.rows and body['p_initial'] is not None:
                self.rows[key] = copy.deepcopy(body['p_initial'])
            if key not in self.rows:
                return httpx.Response(200, json=False)
            self.rows[key].update(body['p_patch'].get('$set', {}))
            return httpx.Response(200, json=True)
        if '/object/upload/sign/' in path:
            return httpx.Response(200, json={'url': path.removeprefix('/storage/v1') + '?token=test'})
        if '/object/info/' in path:
            key = path.split('/field-log-music/')[1]
            if key not in self.objects:
                return httpx.Response(404)
            return httpx.Response(200, json={'metadata': {'size': self.objects[key]}})
        if '/object/sign/' in path:
            return httpx.Response(200, json={'signedURL': '/object/sign/field-log-music/track.mp3?token=test'})
        if req.method == 'DELETE' and path.endswith('/field-log-music'):
            for key in body['prefixes']:
                self.objects.pop(key, None)
            return httpx.Response(200, json=[])
        raise AssertionError(f'Unexpected remote call {req.method} {path}')

    def test_admin_crud_and_draft_privacy(self):
        self.assertEqual(self.client.post('/api/notebooks', json={'label': 'Writing'}).status_code, 401)
        nb = self.client.post('/api/notebooks', json={'label': 'Writing'}, headers=self.auth)
        self.assertEqual(nb.status_code, 200, nb.text)
        nb = nb.json()
        entry = self.client.post('/api/entries', headers=self.auth, json={
            'notebook_id': nb['id'], 'title': 'Secret page', 'body': 'private writing', 'draft': True,
        }).json()
        self.assertEqual(self.client.get('/api/read/' + entry['slug']).status_code, 404)
        self.assertEqual(self.client.get('/api/search?q=Secret').json(), [])
        self.assertEqual(self.client.get('/api/notebooks/writing/full').json()['entries'], [])
        self.assertEqual(len(self.client.get('/api/notebooks/writing/full', headers=self.auth).json()['entries']), 1)
        result = self.client.put('/api/entries/' + entry['id'], json={'draft': False, 'body': 'published'}, headers=self.auth)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(self.client.get('/api/read/' + entry['slug']).json()['entry']['body'], 'published')
        self.assertEqual(self.client.delete('/api/notebooks/' + nb['id'], headers=self.auth).status_code, 200)
        self.assertEqual(self.client.get('/api/read/' + entry['slug']).status_code, 404)

    def test_music_failure_preserves_old_track_and_success_redirects(self):
        self.rows[('settings', 'music')] = {'_id': 'music', 'storage_path': 'tracks/old.mp3', 'filename': 'old.mp3'}
        self.objects['tracks/old.mp3'] = 3
        payload = {'filename': 'new.mp3', 'size': 10000000, 'content_type': 'audio/mpeg'}
        self.assertEqual(self.client.post('/api/music/upload-url', json=payload).status_code, 401)
        ticket = self.client.post('/api/music/upload-url', json=payload, headers=self.auth).json()
        receipt = {k: ticket[k] for k in ('receipt', 'signature')}
        self.assertEqual(self.client.post('/api/music/complete', json=receipt, headers=self.auth).status_code, 503)
        self.assertEqual(self.client.get('/api/music').json()['filename'], 'old.mp3')
        path = json.loads(ticket['receipt'])['storage_path']
        self.objects[path] = 10000000
        tampered = {**receipt, 'signature': '0' * 64}
        self.assertEqual(self.client.post('/api/music/complete', json=tampered, headers=self.auth).status_code, 400)
        self.assertEqual(self.client.post('/api/music/complete', json=receipt, headers=self.auth).status_code, 200)
        self.assertNotIn('tracks/old.mp3', self.objects)
        result = self.client.get('/api/music/stream', follow_redirects=False)
        self.assertEqual(result.status_code, 307)
        self.assertTrue(result.headers['location'].startswith('https://test-project.supabase.co/storage/v1/'))
        self.assertEqual(self.client.delete('/api/music', headers=self.auth).status_code, 200)
        self.assertFalse(self.client.get('/api/music').json()['exists'])

    def test_pagination_filters_after_first_page(self):
        for i in range(510):
            self.rows[('entries', str(i).zfill(4))] = {'id': str(i), 'title': 'later' if i == 509 else 'earlier'}
        import asyncio
        results = asyncio.run(store.db.entries.find({'title': 'later'}).to_list(1))
        self.assertEqual(results[0]['id'], '509')

    def test_search_word_boundary_and_chapter_array(self):
        query = {'$or': [{'body': server.word_start('aru')}, {'chapters.body': server.word_start('aru')}]}
        self.assertFalse(store.matches({'body': 'harus baru'}, query))
        self.assertTrue(store.matches({'chapters': [{'body': 'Aru remembers'}]}, query))

    def test_missing_configuration_is_503(self):
        with patch.dict(os.environ, {'SUPABASE_SECRET_KEY': '', 'SUPABASE_SERVICE_ROLE_KEY': ''}):
            self.assertEqual(self.client.get('/api/notebooks').status_code, 503)


if __name__ == '__main__':
    unittest.main()
