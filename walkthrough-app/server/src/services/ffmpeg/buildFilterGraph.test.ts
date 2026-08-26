import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFilterGraph, CLIP_DURATION_SEC, TRANSITION_DURATION_SEC } from './buildFilterGraph.js';

function photo(n: number) {
  return { absolutePath: `/tmp/photo${n}.jpg`, roomLabel: null };
}

test('totalDurationSec for 3 clips matches n*D - (n-1)*T', () => {
  const { totalDurationSec } = buildFilterGraph({
    photos: [photo(0), photo(1), photo(2)],
    address: null,
    showAddressOverlay: false,
    showRoomLabels: false,
    musicAbsolutePath: null,
    fontAbsolutePath: null,
    outputAbsolutePath: '/tmp/out.mp4',
  });
  assert.equal(totalDurationSec, 3 * CLIP_DURATION_SEC - 2 * TRANSITION_DURATION_SEC);
  assert.equal(totalDurationSec, 13);
});

test('xfade offsets accumulate as i*(D-T) for a 3-clip chain', () => {
  const { args } = buildFilterGraph({
    photos: [photo(0), photo(1), photo(2)],
    address: null,
    showAddressOverlay: false,
    showRoomLabels: false,
    musicAbsolutePath: null,
    fontAbsolutePath: null,
    outputAbsolutePath: '/tmp/out.mp4',
  });
  const filterComplex = args[args.indexOf('-filter_complex') + 1];
  assert.match(filterComplex, /xfade=transition=fade:duration=1:offset=4\[vx1\]/);
  assert.match(filterComplex, /xfade=transition=fade:duration=1:offset=8\[vout\]/);
});

test('a single photo skips xfade and outputs directly to [vout]', () => {
  const { args, totalDurationSec } = buildFilterGraph({
    photos: [photo(0)],
    address: null,
    showAddressOverlay: false,
    showRoomLabels: false,
    musicAbsolutePath: null,
    fontAbsolutePath: null,
    outputAbsolutePath: '/tmp/out.mp4',
  });
  const filterComplex = args[args.indexOf('-filter_complex') + 1];
  assert.equal(totalDurationSec, CLIP_DURATION_SEC);
  assert.match(filterComplex, /\[vout\]$/);
  assert.doesNotMatch(filterComplex, /xfade/);
});

test('omits audio mapping and adds -an when no music track is given', () => {
  const { args } = buildFilterGraph({
    photos: [photo(0), photo(1)],
    address: null,
    showAddressOverlay: false,
    showRoomLabels: false,
    musicAbsolutePath: null,
    fontAbsolutePath: null,
    outputAbsolutePath: '/tmp/out.mp4',
  });
  assert.ok(args.includes('-an'));
  assert.ok(!args.includes('[aout]'));
});

test('maps audio and fades out when a music track is given', () => {
  const { args, totalDurationSec } = buildFilterGraph({
    photos: [photo(0), photo(1)],
    address: null,
    showAddressOverlay: false,
    showRoomLabels: false,
    musicAbsolutePath: '/tmp/music.mp3',
    fontAbsolutePath: null,
    outputAbsolutePath: '/tmp/out.mp4',
  });
  const filterComplex = args[args.indexOf('-filter_complex') + 1];
  assert.ok(args.includes('-stream_loop'));
  assert.ok(args.includes('[aout]'));
  assert.match(filterComplex, new RegExp(`atrim=0:${totalDurationSec}`));
  assert.doesNotMatch(args.join(' '), /-an\b/);
});

test('drawtext overlays are skipped entirely when no font is available', () => {
  const { args } = buildFilterGraph({
    photos: [photo(0)],
    address: '12 Ashgrove Terrace, Cork',
    showAddressOverlay: true,
    showRoomLabels: true,
    musicAbsolutePath: null,
    fontAbsolutePath: null,
    outputAbsolutePath: '/tmp/out.mp4',
  });
  const filterComplex = args[args.indexOf('-filter_complex') + 1];
  assert.doesNotMatch(filterComplex, /drawtext/);
});

test('address overlay text with commas and colons is escaped for drawtext', () => {
  const { args } = buildFilterGraph({
    photos: [photo(0)],
    address: "12 Ashgrove Terrace: Cork, D'Olier",
    showAddressOverlay: true,
    showRoomLabels: false,
    musicAbsolutePath: null,
    fontAbsolutePath: '/tmp/font.ttf',
    outputAbsolutePath: '/tmp/out.mp4',
  });
  const filterComplex = args[args.indexOf('-filter_complex') + 1];
  assert.match(filterComplex, /drawtext=fontfile=/);
  assert.match(filterComplex, /Ashgrove Terrace\\: Cork/);
});
