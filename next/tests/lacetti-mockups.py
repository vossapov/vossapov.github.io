"""Asset/content contract: 3 reviewed cabin boards +10 original native captures +3 videos visible in main sections."""
from pathlib import Path
import hashlib,json
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'next/assets/projects/lacetti-link'
entry=next(e for e in json.loads((ROOT/'next/content/additional-projects.json').read_text()) if e['project']['id']=='lacetti-link')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
boards=sorted((BASE/'mockups').glob('*-final.png'))
native=sorted((BASE/'native').glob('*.png'))
videos=sorted((BASE/'videos').glob('*.mp4'))
assert len(boards)==3, f"Expected 3 mockup boards, got {len(boards)}"
assert len(native)==10, f"Expected 10 native screenshots, got {len(native)}"
assert len(videos)==3, f"Expected 3 videos, got {len(videos)}"
assert len(entry['project']['screens'])==13, f"Expected 13 total screens (3 boards + 10 native), got {len(entry['project']['screens'])}"
# Verify hero is board (cabin mockup)
assert entry['manifest']['hero']=={'scene':'board','imgs':['01-dashboard-final.png']}, "Hero must be single board"
assert entry['project']['cover'].endswith('/mockups/01-dashboard-final.png'), "Cover must be dashboard mockup"
# Verify 3 main sections with videos are visible (not collapsed under gallery)
sections=entry['presentation']['sections']
video_sections=[s for s in sections if s['type']=='video']
assert len(video_sections)==3, f"Expected 3 visible video sections, got {len(video_sections)}"
# Verify each video has landscape kind, poster, and captions
for v in video_sections:
    assert v.get('videoKind')=='landscape', f"Video {v['title']['en']} must have videoKind='landscape'"
    assert 'video' in v, f"Video {v['title']['en']} missing video field"
    assert 'src' in v['video'], f"Video {v['title']['en']} missing src"
    assert 'poster' in v['video'], f"Video {v['title']['en']} missing poster"
    assert 'captions' in v['video'], f"Video {v['title']['en']} missing captions"
    assert 'en' in v['video']['captions'], f"Video {v['title']['en']} missing English captions"
    assert 'ua' in v['video']['captions'], f"Video {v['title']['en']} missing Ukrainian captions"
# Verify all mockup boards are marked with 'board' override
for board in boards:
    assert entry['manifest']['over'][board.name]=='board', f"Mockup {board.name} must be marked as 'board'"
# Verify native image decode
for path in native:
    with Image.open(path) as im:
        assert im.size==(1280,720), f"Native image {path.name} must be 1280x720, got {im.size}"
        im.load()
# Verify mockup boards decode
for board in boards:
    with Image.open(board) as im:
        assert im.size==(1536,1024), f"Mockup {board.name} must be 1536x1024, got {im.size}"
        im.load()
# Verify composite manifests and hashes
composites=json.loads((BASE/'mockups/composites.json').read_text())
for record in composites:
    target=BASE/'mockups'/Path(record['output']).name
    assert sha(target)==record['sha256'], f"Mockup {target.name} hash mismatch"
    assert sha(BASE/'native'/Path(record['native_source']).name)==record['source_sha256'], f"Native {record['native_source']} hash mismatch"
# Verify video manifests and source hashes
SOURCE_MANIFEST=Path('/home/vossapov/Work/thinkpad-migration-staging/C/Users/vossa/Lacetti/dist/Lacetti-Portfolio/manifest.json')
source_data=json.loads(SOURCE_MANIFEST.read_text())
source_hashes={}
for run in source_data['runs']:
    for shot in run['screenshots']:
        source_hashes[Path(shot['path']).name]=shot['sha256']
    source_hashes[Path(run['video']['path']).name]=run['video']['sha256']
# Verify copied video hashes match source
for video in videos:
    expected_hash=next((run['video']['sha256'] for run in source_data['runs'] if Path(run['video']['path']).name==video.name),None)
    actual_hash=sha(video)
    assert actual_hash==expected_hash, f"Video {video.name} hash mismatch: expected {expected_hash}, got {actual_hash}"
# Verify native screenshots copied correctly
for native_path in native:
    expected_hash=source_hashes.get(native_path.name)
    if expected_hash:
        actual_hash=sha(native_path)
        assert actual_hash==expected_hash, f"Native {native_path.name} hash mismatch: expected {expected_hash}, got {actual_hash}"
review=json.loads((BASE/'mockups/claude-final-review.json').read_text())
assert review['is_error'] is False and review['terminal_reason']=='completed', "Mockup review must be approved"
assert 'approve all three' in review['result'].lower(), "Mockup review must approve all three boards"
print('PASS: 3 reviewed 1536x1024 boards; 10 native 1280x720 captures; 3 visible landscape videos with captions; source/output hashes; 13 gallery images; native groups in main sections')
