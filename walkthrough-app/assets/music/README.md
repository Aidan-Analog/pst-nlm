# Background music

Drop licensed `.mp3` files in this folder to make them selectable in the
render options screen — `GET /api/music-tracks` scans this directory at
request time, so no code change or restart is needed.

This folder ships empty. We didn't bundle any audio here because we can't
verify licensing terms for third-party tracks from inside this repo — treat
"royalty-free" claims from any source as something to confirm yourself before
distributing a rendered video that includes it (e.g. via a licensed library
such as Epidemic Sound, Artlist, YouTube Audio Library tracks marked safe for
your use case, or your own recordings).

Filename becomes the track id and display name (e.g. `upbeat-piano.mp3` →
id/name `upbeat-piano`). Duration is probed automatically via `ffprobe`.
