"""Validate the supplied CSV/JSON pair and preserve the JSON without rounding."""
import argparse, csv, hashlib, json, math
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('source',type=Path);args=p.parse_args()
raw=(args.source/'success_rates.json').read_bytes(); data=json.loads(raw)
rows=list(csv.DictReader((args.source/'success_rates.csv').open()))
assert len(rows)==252 and len(data['panels'])==6 and len(data['models'])==6 and len(data['categories'])==7
indexed={(r['panel'],r['model_id'],r['category_id']):r for r in rows}
assert len(indexed)==252
assert [p['position_threshold_cm'] for p in data['panels']]==[10,12.5,15,17.5,20,25]
for panel in data['panels']:
    assert {s['model_id'] for s in panel['series']}=={m['id'] for m in data['models']}
    for s in panel['series']:
        assert all(len(s[k])==7 for k in ['values','successful_motions','evaluated_motions'])
        for i,c in enumerate(data['categories']):
            value,success,count=s['values'][i],s['successful_motions'][i],s['evaluated_motions'][i]
            assert 0<=success<=count and count>0 and math.isclose(value,100*success/count,abs_tol=1e-10)
            row=indexed[panel['id'],s['model_id'],c['id']]
            assert value==float(row['success_rate_percent']) and success==int(row['successful_motions']) and count==int(row['evaluated_motions'])
            assert panel['position_threshold_cm']==float(row['position_threshold_cm'])
root=Path(__file__).resolve().parents[1]
(root/'dist/data/hardware-thresholds.json').write_bytes(raw)
print('Validated 252 values, success counts and denominators; SHA-256:',hashlib.sha256(raw).hexdigest())
