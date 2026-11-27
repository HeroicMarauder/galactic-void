# Custom sound effects

Drop audio files (.ogg, .wav or .mp3) in this folder and list them in `manifest.json`
by the sound's short name, which the in-game Sound Lab (Settings → Sound Lab) shows under each sound.

```json
{ "jump": "my-jump.ogg", "hitMetal": "clang.wav" }
```

Every player hears these. A file someone picks in their own Sound Lab still wins on their device.
Keep effects short (under a second) and trim the silence from the start.
