"""The Fluger demo must be real encoded video, with a red-state poster and motion."""
import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
D=ROOT/'assets/projects/fluger-kids'
assert (D/'radar-red.png').is_file(), 'Missing red danger screenshot'
assert (D/'radar-demo.mp4').is_file(), 'Missing playable animation'
meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(D/'radar-demo.mp4')]))
v=next(s for s in meta['streams'] if s['codec_type']=='video')
assert v['codec_name']=='h264'
assert (v['width'],v['height'])==(936,1680)
assert 17.9 <= float(meta['format']['duration']) <= 18.1
assert int(v['nb_frames'])==432
# Decode actual frames; different hashes prove the file isn't a static poster slideshow.
frames=subprocess.check_output(['ffmpeg','-v','error','-ss','6','-i',str(D/'radar-demo.mp4'),'-t','1','-f','framemd5','-']).decode()
hashes=[line.split(',')[-1].strip() for line in frames.splitlines() if not line.startswith('#')]
assert len(set(hashes))>=20, 'Threat demo has no continuous motion'
proof=json.loads((D/'video-provenance.json').read_text())
assert proof['hit_count']>0, 'Sweep must activate targets'
assert proof['synthetic'] is True
print(json.dumps({'duration':meta['format']['duration'],'frames':v['nb_frames'],'moving_frames':len(set(hashes)),'sweep_hits':proof['hit_count']}))
