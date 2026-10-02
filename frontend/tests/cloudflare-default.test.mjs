import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('unconfigured web media always resolves through Cloudflare', async () => {
  const source = await readFile(new URL('../lib/mediaUrl.js',import.meta.url),'utf8');
  const saved = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  try {
    const {mediaUrl,hasMediaBaseUrl} = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
    assert.equal(hasMediaBaseUrl(),true);
    assert.equal(mediaUrl('/lesson-assets/boy.webp',null,'https://api.example.com'),'https://cdn.learnspanglish.app/lesson-assets/boy.webp');
    assert.equal(mediaUrl('/lesson-assets/boy.webp?v=card','global'),'https://cdn.learnspanglish.app/lesson-assets/boy.webp?v=card-global');
    assert.equal(mediaUrl('/course-audio/elevenlabs-v2/test.mp3'),'https://cdn.learnspanglish.app/course-audio/elevenlabs-v2/test.mp3');
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
    else process.env.NEXT_PUBLIC_MEDIA_BASE_URL=saved;
  }
});
