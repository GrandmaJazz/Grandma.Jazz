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
        # Tempo tracking predicts a beat grid even over a quiet intro/interlude.
        # Combine local loudness with onset prominence so only audible accents
        # can move the bamboo; the grid alone never triggers it.
        onsets = librosa.onset.onset_strength(y=samples, sr=22050, hop_length=256)
        levels = []
        accents = []
        for t in times:
            start = int(float(t) * 22050)
            window = samples[start:min(start + int(.12 * 22050), len(samples))]
            levels.append(float(np.sqrt(np.mean(window * window))) if len(window) else 0.)
            frame = int(float(t) * 22050 / 256)
            accents.append(float(np.max(onsets[max(0, frame-2):min(len(onsets), frame+3)])) if len(onsets) else 0.)
        level_reference = float(np.percentile(levels, 90)) if levels else 1.
        accent_reference = float(np.percentile(accents, 90)) if accents else 1.
        strengths = [round(float(np.clip((level / max(level_reference, 1e-6)) * (accent / max(accent_reference, 1e-6)), 0, 1.2)), 3) for level, accent in zip(levels, accents)]
        output[track_id] = {'source': track['filePath'], 'bpm': round(float(np.asarray(tempo).reshape(-1)[0]), 2), 'duration': round(len(samples)/22050, 3), 'beats': [round(float(t), 3) for t in times], 'strengths': strengths}
        print(track['title'], output[track_id]['bpm'], len(times), 'beats', flush=True)
Path('public/audio/beat-maps.json').write_text(json.dumps(output, separators=(',', ':')))
