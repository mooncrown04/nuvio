pip install cloudscraper flask
python -c "
from cloudscraper import CloudScraper
import re
s = CloudScraper()
s.get('https://www.dizibox.live/')
r = s.get('https://www.dizibox.live/breaking-bad-1-sezon-1-bolum-hd-izle/')
print('Boyut:', len(r.text))
vid = re.search(r'video_id.*?(\d+)', r.text)
print('Video ID:', vid.group(1) if vid else 'Bulunamadı')
"
