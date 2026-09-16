"""Regenerate beat maps after changing music. pip install librosa imageio-ffmpeg.
Maps contain timing only; the original audio is never copied into the website.
"""
import json, subprocess, tempfile, urllib.request
from pathlib import Path
import imageio_ffmpeg
import librosa
import numpy as np

API = 'https://grandma-jazz-api.onrender.com/api/cards'
catalog = json.load(urllib.request.urlopen(API))
tracks = {m['_id']: m for c in catalog['cards'] for m in c['music']}
output = {}
with tempfile.TemporaryDirectory() as directory:
    for track_id, track in tracks.items():
        source = Path(directory) / f'{track_id}.mp3'
        urllib.request.urlretrieve(track['filePath'], source)
        raw = subprocess.check_output([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-i', str(source), '-f', 'f32le', '-ac', '1', '-ar', '22050', '-'])
        samples = np.frombuffer(raw, dtype='<f4')
        tempo, frames = librosa.beat.beat_track(y=samples, sr=22050, hop_length=256, trim=True)
        times = librosa.frames_to_time(frames, sr=22050, hop_length=256)
        output[track_id] = {'source': track['filePath'], 'bpm': round(float(np.asarray(tempo).reshape(-1)[0]), 2), 'duration': round(len(samples)/22050, 3), 'beats': [round(float(t), 3) for t in times]}
        print(track['title'], output[track_id]['bpm'], len(times), 'beats', flush=True)
Path('public/audio/beat-maps.json').write_text(json.dumps(output, separators=(',', ':')))
