#!/usr/bin/env python3
"""Export the approved test134/46k evaluation snapshot, without internal paths.

Input is the saved evaluation dashboard HTML, not a network request. No script
from that document is executed. Only its JSON data blocks are read.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from statistics import mean


ROOT = Path(__file__).resolve().parents[1]
ANCHOR_CHECKPOINT_SHA256 = "5757a7d5a5632ae611060508a86032af5cbc5152098aed32edcb7da71f1f31ea"
MODELS = [
    ("anchor-global", "Anchorᴳ", "test134_46k_human_global_reference", "test134_46k_g1_global_reference", False, 0.06),
    ("anchor-local", "Anchorᴸ", "test134_46k_human_reanchor_reference", "test134_46k_g1_reanchor_reference", False, 0.06),
    ("scale-global", "ScaleBFMᴳ", "scalebfm_xl_wholebody14", "scalebfm_xl_wholebody14", True, 0.10),
    ("scale-local", "ScaleBFMᴸ", "scalebfm_xl_wholebody14_local", "scalebfm_xl_wholebody14_local", True, 0.10),
    ("sonic", "SONIC v1.1 (G1)", "sonic_v1_1_g1", "sonic_v1_1_g1", True, 0.90),
    ("mimic", "MimicLite v1.1", "mimiclite_v1_1", "mimiclite_v1_1", True, 0.08),
]
COHORTS = [("inhouse", "In-house", "自建动作集", 15342), ("public", "Public", "公开动作集", 2230)]


def block(html: str, name: str) -> dict:
    match = re.search(r'<script id="' + re.escape(name) + r'" type="application/json">(.*?)</script>', html, re.S)
    if not match:
        raise ValueError(f"Missing data block: {name}")
    return json.loads(match.group(1))


def selected_record(data: dict, config: str, dataset: str) -> dict:
    matches = [r for r in data["records"] if r["config"] == config and r["dataset"] == dataset and r["simulator"] == "isaacsim" and r["dr"] is True]
    assert len(matches) == 1, (config, dataset, len(matches))
    if config.startswith("test134_46k_"):
        assert matches[0]["checkpointSha256"] == ANCHOR_CHECKPOINT_SHA256, "Anchor checkpoint hash changed"
    return matches[0]


def model_metadata(data: dict) -> list:
    return [{"id": mid, "label": label, "input": selected_record(data, config, "inhouse")["input"],
             "checkpointSha256": selected_record(data, config, "inhouse").get("checkpointSha256"),
             "onlineRetargeting": retarget, "trackingConfig": config, "reachabilityConfig": reach_config}
            for mid, label, config, reach_config, retarget, _ in MODELS]


def simulation(data: dict) -> dict:
    cohorts = []
    expected = {"inhouse": [89.6, 85.7, 53.4, 35.4, 33.6, 28.8], "public": [59.1, 57.3, 35.2, 26.0, 25.9, 18.9]}
    anchor_expected = {"inhouse": [89.58414809020988, 85.7124234128536], "public": [59.14798206278027, 57.264573991031384]}
    for dataset, label, label_zh, count in COHORTS:
        series = []
        for mid, model_label, config, _, _, _ in MODELS:
            row = selected_record(data, config, dataset)
            assert row["local"]["valid"] == count and row["global"]["valid"] == count
            local_success_count = round(row["local"]["main"] * count / 100)
            global_success_count = round(row["global"]["main"] * count / 100)
            assert abs(row["local"]["main"] - 100 * local_success_count / count) < 1e-10
            assert abs(row["global"]["main"] - 100 * global_success_count / count) < 1e-10
            series.append({"id": mid, "label": model_label, "config": config, "input": row["input"], "count": count,
                           "localSuccessCount": local_success_count, "globalSuccessCount": global_success_count, "localSuccess": row["local"]["main"],
                           "globalSuccess": row["global"]["main"], "rootError": row["global"]["root"],
                           "wristError": row["local"]["wrist"], "ankleError": row["local"]["ankle"]})
        assert [round(s["localSuccess"], 1) for s in series] == expected[dataset], "Values do not match the approved snapshot"
        assert [s["localSuccess"] for s in series[:2]] == anchor_expected[dataset]
        cohorts.append({"id": dataset, "label": label, "labelZh": label_zh, "count": count, "series": series})
    return {"cohorts": cohorts, "metric": {
        "successUnit": "%", "errorUnit": "mm", "success": data["mainMetric"],
        "rootErrorFrame": "global", "wristErrorFrame": "local", "ankleErrorFrame": "local",
        "errorWindow": "Frames before the first body14 position error exceeds 25 cm; average within each motion, then across motions. Observation windows can differ between controllers.",
        "frameDefinition": "Global: fixed initial pelvis XY and yaw alignment. Local: additional per-frame horizontal pelvis translation removal; height and heading differences remain.",
    }}


def radars(data: dict) -> list:
    ds = data["datasets"]["inhouse"]
    definitions = {r["id"]: r for r in ds["radars"]}
    labels = {
        "home_fixed": ("Stationary tasks", "原地任务", ["High unilateral reach", "Far unilateral reach", "Forward bending", "Shallow squat", "Half kneeling", "Asymmetric bimanual reach", "Unilateral arm swing", "Opposite bilateral swing"], list(range(8))),
        "home_moving": ("Mobile tasks", "移动任务", ["Small forward steps", "Small lateral steps", "World-fixed hand hold", "Forward walking", "Turning"], [0, 1, 4, 3, 2]),
    }
    result = []
    for rid, (label, label_zh, axis_labels, order) in labels.items():
        definition = definitions[rid]
        axes = [{"id": definition["axes"][i]["id"], "label": axis_labels[j], "labelZh": definition["axes"][i]["label"], "count": definition["axes"][i]["expected"]} for j, i in enumerate(order)]
        series = []
        for mid, model_label, config, _, _, _ in MODELS:
            record = ds["results"][f"isaacsim|{config}|on"]
            totals = [record["totals"][a["id"]] for a in axes]
            successes = [record["mainCounts"][a["id"]][0] for a in axes]
            assert totals == [a["count"] for a in axes]
            series.append({"id": mid, "label": model_label, "config": config, "values": [100 * s / n for s, n in zip(successes, totals)], "successes": successes, "counts": totals})
        result.append({"id": rid, "label": label, "labelZh": label_zh, "axes": axes, "series": series, "unit": "%", "metric": "local main success", "note": "Categories contain complete motions with the indicated phase and may overlap."})
    return result


def reachability(data: dict) -> dict:
    assert len(data["motions"]) == 3210
    assert data["taskMetric"]["window"] == [5.5, 16.5] and data["taskMetric"]["includeEnd"] is True
    index = {name: i for i, name in enumerate(data["fields"])}
    groups = [
        ("standing", "Standing", "站姿", ["standing"]),
        ("shallow-squat", "Shallow squat", "半蹲", ["half_squat"]),
        ("deep-squat", "Deep squat", "深蹲", ["deep_squat"]),
        ("staggered", "Staggered stance", "跨步站姿", ["staggered_left", "staggered_right"]),
        ("half-kneeling", "Half kneeling", "单膝跪地", ["half_kneel_left", "half_kneel_right"]),
    ]
    grouped_indices = [[i for i, motion in enumerate(data["motions"]) if motion["posture"] in ids] for _, _, _, ids in groups]
    assert sum(map(len, grouped_indices)) == 3210
    axes = [{"id": mid, "label": label, "labelZh": label_zh, "count": len(ids)} for (mid, label, label_zh, _), ids in zip(groups, grouped_indices)]
    series, foot = [], []
    for mid, label, _, config, _, _ in MODELS:
        matches = [c for c in data["conditions"] if c["config"] == config and c["simulator"] == "isaacsim" and c["dr"] is True]
        assert len(matches) == 1
        values = matches[0]["values"]
        valid = lambda row: row[index["mainComplete"]] == 1 and row[index["feetAvailable"]] == 1
        assert all(valid(row) for row in values), "Snapshot should have complete tracking and feet data for all motions"
        success = lambda row: valid(row) and row[index["taskSuccess"]] == 1
        successes = [sum(success(values[i]) for i in ids) for ids in grouped_indices]
        series.append({"id": mid, "label": label, "config": config, "values": [100 * s / len(ids) for s, ids in zip(successes, grouped_indices)], "successes": successes, "counts": list(map(len, grouped_indices)), "overallSuccess": 100 * sum(success(row) for row in values) / len(values)})
        foot.append({"id": mid, "label": label, "config": config, "slips": mean(row[index["slipCount"]] for row in values), "steps": mean(row[index["stepCount"]] for row in values), "touchdowns": mean(row[index["touchdownCount"]] for row in values), "count": len(values)})
    return {"count": 3210, "postures": {"axes": axes, "series": series, "unit": "%"}, "difficulty": None,
            "footEvents": {"series": foot, "unit": "events / motion"}, "windowSeconds": [5.5, 16.5], "includeEnd": True,
            "metric": "Global main tracking success with zero foot slips, undesired steps, or undesired touchdowns during the task window.",
            "notes": ["Anchor uses robot-space G1 references for this benchmark, unlike its human references in the other two simulation cohorts.",
                      "Left and right posture variants and wrist targets are pooled. All 3,210 motions have complete tracking and foot-event records for every selected controller.",
                      "Figure 3G's reference CoM difficulty grouping is not present in the supplied dashboard JSON. No values were inferred from the printed figure."]}


def lookahead(data: dict) -> dict:
    models = MODELS + [("sonic-smpl", "SONIC v1.1 (SMPL)", "sonic_v1_1_smpl", "", False, 0.18)]
    cohorts = []
    for dataset, label, label_zh, count in COHORTS:
        series = []
        for mid, model_label, config, _, retarget, seconds in models:
            row = selected_record(data, config, dataset)
            assert row["local"]["valid"] == count
            series.append({"id": mid, "label": model_label, "config": config, "input": row["input"],
                           "lookaheadSeconds": seconds, "localSuccess": row["local"]["main"], "onlineRetargeting": retarget})
        cohorts.append({"id": dataset, "label": label, "labelZh": label_zh, "count": count, "series": series})
    assert cohorts[0]["series"][-1]["localSuccess"] == 0.6257332811888932
    assert cohorts[1]["series"][-1]["localSuccess"] == 8.295964125560538
    return {"cohorts": cohorts, "series": cohorts[0]["series"], "count": cohorts[0]["count"],
            "note": "This compares complete controller configurations; look-ahead is the furthest future reference time, not end-to-end inference latency. It does not isolate the causal effect of look-ahead. Durations and retargeting requirements retain the documented controller settings; success rates use the fixed test134/46k snapshot for each cohort."}


def hardware() -> dict:
    # These printed values are transcribed from the supplied paper, not inferred
    # from radar pixels and not from the dashboard's simulated real_robot set.
    errors = [
        ("anchor", "Anchor", 40.61, 49.02, 71, 72),
        ("scale14", "ScaleBFM (14-point)", 58.68, 61.65, 71, 72),
        ("scale5", "ScaleBFM (5-point)", 54.74, 68.42, 70, 71),
        ("sonic-g1", "SONIC v1.1 (G1)", 45.51, 67.90, 67, 69),
        ("sonic-smpl", "SONIC v1.1 (SMPL)", 96.11, 76.89, 66, 70),
        ("mimic-roa", "MimicLite (ROA)", 46.53, 62.98, 71, 72),
    ]
    standing = [
        ("mimic-roa", "MimicLite (ROA)", True, 65.05, 9.13, 46.44, 9.71, False),
        ("scale14", "ScaleBFM (14-point)", True, 64.18, 6.40, 46.15, 8.26, False),
        ("scale5", "ScaleBFM (5-point)", True, 72.69, 8.34, 51.22, 8.25, False),
        ("sonic-g1", "SONIC v1.1 (G1)", True, 98.15, 10.19, 42.38, 9.42, False),
        ("sonic-smpl", "SONIC v1.1 (SMPL)", False, 166.70, 19.20, 85.87, 18.75, False),
        ("anchor", "Anchor†", False, 56.66, 6.18, 35.38, 5.80, True),
    ]
    return {
        "provenance": {"repository": "ilnehc/S0_Report", "branch": "main", "commit": "5be61b757506e6bf0b7f8e8370bab585294bf907", "table": "tab:real-main", "figure": "fig:real-results", "source": "sections/results.tex"},
        "trackingErrors": {"series": [{"id": mid, "label": label + ("†" if mid == "anchor" else ""), "wristError": wrist, "ankleError": ankle, "contributing": retained, "valid": valid, "preliminary": mid == "anchor"} for mid, label, wrist, ankle, retained, valid in errors], "unit": "mm",
            "note": "Mean local errors use nonempty windows ending before the first valid active control tick with any body14 position error above 25 cm, without an orientation gate. Left/right end effectors and valid ticks are averaged within each motion, then motions are weighted equally. Failed motions contribute when their window is nonempty; empty windows are excluded. Local scoring removes per-frame horizontal translation differences, unlike pelvis-relative standing-reach scoring. † Anchor results are preliminary."},
        "standingReach": {"count": 51, "series": [{"id": mid, "label": label, "onlineRetargeting": retarget, "globalPosition": gp, "globalRotation": gr, "localPosition": lp, "localRotation": lr, "preliminary": preliminary} for mid, label, retarget, gp, gr, lp, lr, preliminary in standing], "positionUnit": "mm", "rotationUnit": "deg", "note": "† Anchor standing-reach values are preliminary in the supplied paper."},
        "thresholdFigure": {"thresholdsCm": [10, 12.5, 15, 17.5, 20, 25], "numericValuesAvailable": False, "note": "The supplied radar image does not print the per-point success rates. It is shown as an image; exact numeric tooltips are not fabricated."}
    }


def downstream() -> dict:
    tasks = [{"id": "slippers", "label": "Pick up slippers", "labelZh": "拾取拖鞋"}, {"id": "clothes", "label": "Throw dirty clothes", "labelZh": "投放脏衣物"}, {"id": "box", "label": "Kick cardboard box", "labelZh": "踢纸箱"}, {"id": "trash", "label": "Clear shelf surface", "labelZh": "清理架面"}]
    return {"tasks": tasks,
            "collection": {"series": [
                {"id": "sonic-smpl", "label": "SONIC v1.1 (SMPL)", "demosPerHour": [41, 24, 9, 39], "success": [68.33, 55.81, 37.50, 81.25]},
                {"id": "anchor-star", "label": "Anchor*", "demosPerHour": [67, 57, 45, 74], "success": [93.10, 93.50, 94.74, 96.15]},
                {"id": "anchor-current", "label": "Anchor", "demosPerHour": [None] * 4, "success": [None] * 4, "pending": True}]},
            "autonomy": {"taskOrder": ["box", "trash", "slippers", "clothes"], "unit": "%", "series": [
                {"id": "sonic-token", "label": "SONIC v1.1 (SMPL)", "interface": "Motion token", "values": [70, 0, 10, 40]},
                {"id": "anchor-star-sparse", "label": "Anchor* (re-locate)", "interface": "Sparse", "values": [85, 50, 45, 60]},
                {"id": "anchor-star-token", "label": "Anchor* (re-locate)", "interface": "Motion token", "values": [0, 0, 0, 0]},
                {"id": "anchor-sparse", "label": "Anchor (re-locate + PRED feedback)", "interface": "Sparse", "values": [None] * 4, "pending": True},
                {"id": "anchor-token", "label": "Anchor (re-locate + PRED feedback)", "interface": "Motion token", "values": [None] * 4, "pending": True}]},
            "note": "* denotes the earlier variant with error feedback supplied to the encoder (test101/59000). Current-model collection and autonomy results are pending in the supplied paper; they are not replaced with earlier-variant results."}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=ROOT / ".cache/evaluation.html")
    parser.add_argument("--output", type=Path, default=ROOT / "dist/data/paper-results.json")
    args = parser.parse_args()
    raw = args.input.read_bytes()
    html = raw.decode("utf-8")
    data = block(html, "data")
    result = {"schemaVersion": 1,
              "snapshot": {"label": "Evaluation snapshot · test134 · 46k", "checkpoint": "test134 / 46000", "checkpointSha256": ANCHOR_CHECKPOINT_SHA256, "simulator": "Isaac Sim", "domainRandomization": True,
                           "source": "Supplied evaluation dashboard and S0_Report paper figures/tables", "sourceUrl": "http://172.16.3.99:18080/", "sourceSha256": hashlib.sha256(raw).hexdigest(), "sourceGeneratedAt": data.get("generatedAt"),
                           "historicalPaperFigures": [{"file": "simulation-summary.pdf", "checkpoint": "test132 / 38000"}, {"file": "lookahead-comparison.pdf", "checkpoint": "test132 / 38000"}]},
              "models": model_metadata(data), "simulation": simulation(data), "radars": radars(block(html, "radarData")),
              "reachability": reachability(block(html, "reachData")), "lookahead": lookahead(data), "hardware": hardware(), "downstream": downstream(),
              "notes": ["G and L identify input modes; scoring frames are independently specified.", "The supplied original paper simulation and look-ahead figures use test132/38k and are historical references only. Interactive simulation data is pinned to the approved test134/46k snapshot; hardware and downstream data retain their separately documented experiment versions.", "Raw source paths, unrelated checkpoints, and large per-motion payloads are intentionally excluded.", "The dashboard dataset named real_robot consists of simulation evaluations on hardware motion references; it is not used as measured hardware results."]}
    encoded = json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    assert "/Users/" not in encoded and "/mnt/" not in encoded and "/workspace/" not in encoded
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(encoded)
    print(f"Wrote {args.output.name}: {len(encoded.encode('utf-8')):,} bytes; 2 simulation cohorts, 2 task radars, 5 reachability postures, 2 look-ahead cohorts with 7 configurations each.")


if __name__ == "__main__":
    main()
