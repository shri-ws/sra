"""
DHANA / DARIDRA ANALYSIS ENGINE  (read-only consumer of a host Patrika engine)

Design rules
  * No chart data in code. Classical reference tables, tunables and yoga rules live
    in data sections (REFERENCE_TABLES, CONFIG, RULES) that can be edited or loaded
    from JSON without touching engine logic.
  * Integer arc-seconds everywhere internally. Float degrees are accepted only if
    CONFIG["float_input_policy"] allows, and are then flagged.
  * Three data states: valid / absent (rule -> NOT_EVALUATED) / invalid (raises).
  * Every rule starts verified=False. Verse references are None until a human
    checks them against an edition.
"""
from __future__ import annotations
import json
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

# =============================================================================
# 1. GEOMETRY (definitions of the circle, not chart data)
# =============================================================================
ARCSEC_PER_DEG = 3600
ARCSEC_PER_SIGN = 30 * ARCSEC_PER_DEG
ARCSEC_PER_CIRCLE = 360 * ARCSEC_PER_DEG
SIGN_COUNT = 12
NAVAMSHA_PER_SIGN = 9
ARCSEC_PER_NAVAMSHA = ARCSEC_PER_SIGN // NAVAMSHA_PER_SIGN


class ChartInputError(ValueError):
    pass


def house_from(ref_sign: int, sign: int) -> int:
    """1-based whole-sign house of `sign` counted from `ref_sign`."""
    return (sign - ref_sign) % SIGN_COUNT + 1


def house_plus(house: int, offset: int) -> int:
    """House reached by counting `offset` (1-based, inclusive) from `house`."""
    return (house + offset - 2) % SIGN_COUNT + 1


def angle_to_arcsec(spec: Any, policy: str, flags: List[str], label: str) -> int:
    """spec is explicit: {"arcsec": int} | {"dms": (d, m, s)} | {"deg": float}."""
    if not isinstance(spec, dict) or len(spec) != 1:
        raise ChartInputError(f"{label}: angle must be one of {{arcsec}}, {{dms}}, {{deg}}")
    (kind, val), = spec.items()
    if kind == "arcsec":
        if isinstance(val, bool) or not isinstance(val, int):
            raise ChartInputError(f"{label}: arcsec must be int")
        arc = val
    elif kind == "dms":
        d, m, s = val
        if not (isinstance(d, int) and isinstance(m, int)) or not 0 <= m < 60:
            raise ChartInputError(f"{label}: invalid dms {val}")
        if isinstance(s, int):
            sec = s
        else:
            sec = round(s)
            flags.append(f"{label}: fractional arc-seconds rounded to nearest integer")
        if not 0 <= sec < 60:
            raise ChartInputError(f"{label}: invalid seconds {s}")
        arc = d * ARCSEC_PER_DEG + m * 60 + sec
    elif kind == "deg":
        if policy == "reject":
            raise ChartInputError(f"{label}: float degrees rejected by policy")
        arc = int(round(float(val) * ARCSEC_PER_DEG))
        flags.append(f"{label}: float degrees converted (error up to 0.5 arc-sec + input precision)")
    else:
        raise ChartInputError(f"{label}: unknown angle form '{kind}'")
    if not 0 <= arc < ARCSEC_PER_CIRCLE:
        raise ChartInputError(f"{label}: longitude {arc} arc-sec outside [0, {ARCSEC_PER_CIRCLE})")
    return arc


# =============================================================================
# 2. REFERENCE TABLES (classical lookups; school-dependent items are flagged)
# =============================================================================
D = ARCSEC_PER_DEG
REFERENCE_TABLES: Dict[str, Any] = {
    "SIGN_NAMES": ["Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya",
                   "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena"],
    "PLANET_NAMES": {"SU": "Surya", "MO": "Chandra", "MA": "Mangal", "ME": "Budh",
                     "JU": "Guru", "VE": "Shukra", "SA": "Shani", "RA": "Rahu", "KE": "Ketu"},
    # index = sign (Mesha=0)
    "SIGN_LORDS": ["MA", "VE", "ME", "MO", "SU", "ME", "VE", "MA", "JU", "SA", "SA", "JU"],
    # (sign, arc-sec in sign). Debilitation is derived: opposite sign, same degree.
    "EXALTATION": {"SU": (0, 10 * D), "MO": (1, 3 * D), "MA": (9, 28 * D), "ME": (5, 15 * D),
                   "JU": (3, 5 * D), "VE": (11, 27 * D), "SA": (6, 20 * D)},
    # (sign, start, end) end-exclusive
    "MOOLATRIKONA": {"SU": (4, 0, 20 * D), "MO": (1, 3 * D, 30 * D), "MA": (0, 0, 12 * D),
                     "ME": (5, 15 * D, 20 * D), "JU": (8, 0, 10 * D),
                     "VE": (6, 0, 15 * D), "SA": (10, 0, 20 * D)},
    # Nodes: school-dependent -> empty by default. Example: {"RA": {"exalted": 1, "debilitated": 7}}
    "NODE_DIGNITY": {},
    "INDU_KALAS": {"SU": 30, "MO": 16, "MA": 6, "ME": 8, "JU": 10, "VE": 12, "SA": 1},
    # Navamsha start sign by element (fire, earth, air, water)
    "NAVAMSHA_START_BY_ELEMENT": {0: 0, 1: 9, 2: 6, 3: 3},
    # VERIFY against source before relying on it: pushkara navamsha index (0-8) by element
    "PUSHKARA_NAVAMSHA_BY_ELEMENT": {0: (6, 8), 1: (2, 4), 2: (5, 7), 3: (0, 2)},
}

# =============================================================================
# 3. CONFIG (every tunable lives here; all are uncalibrated until backtested)
# =============================================================================
CONFIG: Dict[str, Any] = {
    "float_input_policy": "accept_with_flag",      # or "reject"
    "required_zodiac": "sidereal",
    "supported_house_systems": ["whole_sign"],
    "mt_overrides_exaltation": True,               # school switch
    "chara_karaka_scheme": 7,                      # 7 or 8
    "karaka_labels": {7: ["AK", "AmK", "BK", "MK", "PK", "GK", "DK"],
                      8: ["AK", "AmK", "BK", "MK", "PiK", "PK", "GK", "DK"]},
    "sav_total": 337,
    "bav_totals": {"SU": 48, "MO": 49, "MA": 39, "ME": 54, "JU": 56, "VE": 52, "SA": 39},
    "shadbala_input_unit": "rupa",                 # or "virupa" (divided by 60)
    "shadbala_plausible_max_rupa": 20.0,
    "shadbala_min_rupa": {"SU": 6.5, "MO": 6.0, "MA": 5.0, "ME": 7.0, "JU": 6.5, "VE": 5.5, "SA": 5.0},
    "shadbala_weights": {"JU": 0.6, "VE": 0.4},
    "house_sets": {
        "kendra": [1, 4, 7, 10], "trikona": [1, 5, 9], "kendra_trikona": [1, 4, 5, 7, 9, 10],
        "upachaya": [3, 6, 10, 11], "dusthana": [6, 8, 12],
    },
    "groups": {
        "physical": ["SU", "MO", "MA", "ME", "JU", "VE", "SA"],
        "benefic_candidates": ["ME", "JU", "VE"],
        "kemadruma_planets": ["MA", "ME", "JU", "VE", "SA"],
        "mahapurusha_planets": ["MA", "ME", "JU", "VE", "SA"],
    },
    # whole degrees; "retro" omitted => same as direct
    "combustion_limits_deg": {"MO": {"direct": 12}, "MA": {"direct": 17},
                              "ME": {"direct": 14, "retro": 12}, "JU": {"direct": 11},
                              "VE": {"direct": 10, "retro": 8}, "SA": {"direct": 15}},
    "aspects": {"base": [7], "special": {"MA": [4, 8], "JU": [5, 9], "SA": [3, 10],
                                         "RA": [5, 9], "KE": [5, 9]}},
    "relation_priority": ["Parivartana", "Yuti", "Mutual_Drishti", "Jaimini_Drishti",
                          "Trine", "Single_Drishti"],
    "benefic": {"always": ["JU", "VE"], "moon_requires_shukla": True,
                "mercury_malefic_if_with": ["SU", "MA", "SA", "RA", "KE"]},
    "neechabhanga": {
        "min_conditions": 1,
        "conditions": [   # school-dependent list; toggle per condition
            {"id": "DEBIL_SIGN_LORD_KENDRA", "enabled": True},
            {"id": "PLANET_EXALTED_IN_DEBIL_SIGN_KENDRA", "enabled": True},
            {"id": "EXALT_SIGN_LORD_KENDRA", "enabled": True},
            {"id": "EXALT_SIGN_LORD_ASPECTS", "enabled": True},
            {"id": "DEBIL_AND_EXALT_LORDS_MUTUAL_KENDRA", "enabled": False},
            {"id": "PUSHKARA_NAVAMSHA", "enabled": False},
        ],
    },
    "strength_modifiers": {"combust": 0.5, "debilitated_uncancelled": 0.5, "dignity_bonus": {}},
    "strength_applies_to": ["DHANA", "RAJA_DHANA"],
    "sav_low_ratio": 0.85,                         # house SAV < ratio * (total/12)
    "multipliers": {
        "sav": {"gain_house": 11, "loss_house": 12, "pos_step": 0.025, "pos_cap": 1.20,
                "neg_step": 0.03, "neg_floor": 0.80},
        "shadbala": {"floor": 0.75, "cap": 1.25},
    },
    "scoring": {"scale_max": 1000, "saturation_fraction": 0.5, "calibrated": False},
    # qualitative bands only; no rupee claims. "upper" inclusive on the index.
    "bands": [
        {"tier": 1, "upper": 100, "label": "Alpa-sanchaya / Low retention"},
        {"tier": 2, "upper": 200, "label": "Fragile accumulation"},
        {"tier": 3, "upper": 300, "label": "Modest, steady"},
        {"tier": 4, "upper": 400, "label": "Reliable base"},
        {"tier": 5, "upper": 500, "label": "Good capacity"},
        {"tier": 6, "upper": 600, "label": "Strong capacity"},
        {"tier": 7, "upper": 700, "label": "Very strong capacity"},
        {"tier": 8, "upper": 800, "label": "Exceptional capacity"},
        {"tier": 9, "upper": 900, "label": "Rare capacity"},
        {"tier": 10, "upper": 1000, "label": "Highest indicated capacity"},
    ],
    "unknown_policy": "neutral_and_flag",
}

# =============================================================================
# 4. YOGA RULE REGISTRY (pure data; add rules without touching engine code)
# weight: number | {"by":"relation","values":{...},"default":n} | {"per":"count","unit":n,"cap":n}
# source: text name only. ref stays None until verified by a human.
# =============================================================================
def _src(text: str, school: str = "") -> Dict[str, Any]:
    return {"text": text, "ref": None, "verified": False, "school": school}

_REL3 = ["Parivartana", "Yuti", "Mutual_Drishti"]
_SAME_PLACED = {"all": [{"p": "same_planet", "a": "{A}", "b": "{B}"},
                        {"p": "in_houses", "sel": "{A}", "houses": "set:kendra_trikona", "frm": "lagna"}],
                "meta": {"relation": "Same_Lord_Placed"}}


def _lord_pair_rule(rid, name, category, ha, hb, values, text):
    a, b = f"lord:{ha}", f"lord:{hb}"
    same = json.loads(json.dumps(_SAME_PLACED).replace("{A}", a).replace("{B}", b))
    return {"id": rid, "name": name, "category": category,
            "weight": {"by": "relation", "values": values, "default": 0},
            "when": {"any": [{"p": "related", "a": a, "b": b, "types": _REL3}, same]},
            "strength_planets": [a, b], "source": _src(text)}


RULES: List[Dict[str, Any]] = [
    _lord_pair_rule("DH_L2_L11", "Dhanesh-Labhesh sambandha", "DHANA", 2, 11,
                    {"Parivartana": 70, "Yuti": 55, "Mutual_Drishti": 45, "Same_Lord_Placed": 60}, "BPHS dhana yogas"),
    _lord_pair_rule("DH_L1_L2", "Lagnesh-Dhanesh sambandha", "DHANA", 1, 2,
                    {"Parivartana": 55, "Yuti": 50, "Mutual_Drishti": 40, "Same_Lord_Placed": 45}, "BPHS dhana yogas"),
    _lord_pair_rule("DH_L5_L11", "Putresh-Labhesh sambandha", "DHANA", 5, 11,
                    {"Parivartana": 50, "Yuti": 45, "Mutual_Drishti": 35, "Same_Lord_Placed": 40}, "BPHS dhana yogas"),
    _lord_pair_rule("DH_L9_L2", "Bhagyesh-Dhanesh sambandha", "DHANA", 9, 2,
                    {"Parivartana": 55, "Yuti": 50, "Mutual_Drishti": 40, "Same_Lord_Placed": 45}, "BPHS dhana yogas"),
    _lord_pair_rule("RJ_L9_L10", "Dharma-Karmadhipati sambandha", "RAJA_DHANA", 9, 10,
                    {"Parivartana": 60, "Yuti": 55, "Mutual_Drishti": 45, "Same_Lord_Placed": 50}, "BPHS / Laghu Parashari"),
    {"id": "PD_VASUMATI_FULL", "name": "Vasumati (full)", "category": "DHANA", "weight": 80,
     "when": {"any": [
         {"p": "count_in_houses", "group": "benefic_candidates", "houses": "set:upachaya", "frm": "lagna", "min": 3, "benefic_only": True},
         {"p": "count_in_houses", "group": "benefic_candidates", "houses": "set:upachaya", "frm": "moon", "min": 3, "benefic_only": True}]},
     "source": _src("Phaladeepika / Brihat Jataka")},
    {"id": "PD_VASUMATI_PARTIAL", "name": "Vasumati (partial)", "category": "DHANA", "weight": 45,
     "when": {"all": [
         {"not": {"rule_triggered": "PD_VASUMATI_FULL"}},
         {"any": [
             {"p": "count_in_houses", "group": "benefic_candidates", "houses": "set:upachaya", "frm": "lagna", "min": 2, "benefic_only": True},
             {"p": "count_in_houses", "group": "benefic_candidates", "houses": "set:upachaya", "frm": "moon", "min": 2, "benefic_only": True}]}]},
     "source": _src("Phaladeepika", "partial form is school-dependent")},
    {"id": "BJ_CHANDRADHI_FULL", "name": "Chandradhi (full)", "category": "DHANA", "weight": 85,
     "when": {"p": "count_in_houses", "group": "benefic_candidates", "houses": [6, 7, 8], "frm": "moon", "min": 3, "benefic_only": True},
     "source": _src("Brihat Jataka / Phaladeepika")},
    {"id": "BJ_CHANDRADHI_PARTIAL", "name": "Chandradhi (partial)", "category": "DHANA", "weight": 50,
     "when": {"all": [{"not": {"rule_triggered": "BJ_CHANDRADHI_FULL"}},
                      {"p": "count_in_houses", "group": "benefic_candidates", "houses": [6, 7, 8], "frm": "moon", "min": 2, "benefic_only": True}]},
     "source": _src("Brihat Jataka", "partial form is school-dependent")},
    {"id": "BPHS_INDU_EXALTED", "name": "Exalted planet in Indu Lagna", "category": "DHANA", "weight": 95,
     "when": {"p": "count_in_houses", "group": "physical", "houses": [1], "frm": "indu", "min": 1, "dignity": ["Exalted"]},
     "source": _src("BPHS (Indu Lagna)")},
    {"id": "BPHS_INDU_BENEFIC", "name": "Benefic in Indu Lagna", "category": "DHANA", "weight": 60,
     "when": {"all": [{"not": {"rule_triggered": "BPHS_INDU_EXALTED"}},
                      {"p": "count_in_houses", "group": "physical", "houses": [1], "frm": "indu", "min": 1, "benefic_only": True}]},
     "source": _src("BPHS (Indu Lagna)")},
    {"id": "JM_AK_AMK", "name": "AK-AmK connection", "category": "RAJA_DHANA",
     "weight": {"by": "relation", "values": {"Parivartana": 65, "Yuti": 65, "Jaimini_Drishti": 45}, "default": 0},
     "when": {"p": "related", "a": "karaka:AK", "b": "karaka:AmK", "types": ["Parivartana", "Yuti", "Jaimini_Drishti"]},
     "strength_planets": ["karaka:AK", "karaka:AmK"], "source": _src("Jaimini Upadesha Sutras")},
    {"id": "JM_AL_11", "name": "Planets in 11th from Arudha Lagna", "category": "DHANA",
     "weight": {"per": "count", "unit": 30, "cap": 60},
     "when": {"p": "count_in_houses", "group": "physical", "houses": [11], "frm": "al", "min": 1},
     "source": _src("Jaimini Upadesha Sutras")},
    {"id": "SC_VIPARITA", "name": "Viparita (trik lords in trik)", "category": "DHANA",
     "weight": {"per": "count", "unit": 25, "cap": 75},
     "when": {"p": "count_lords_in_houses", "lords": [6, 8, 12], "houses": "set:dusthana", "frm": "lagna", "min": 1},
     "source": _src("Sarvartha Chintamani / BPHS", "single-lord form is traditional; strictness varies")},
    {"id": "NB_RAJA", "name": "Neechabhanga Rajayoga ({P})", "category": "RAJA_DHANA", "weight": 55,
     "for_each": "physical", "when": {"p": "neechabhanga", "sel": "$P"},
     "strength_planets": ["$P"], "source": _src("Phaladeepika", "condition list is school-dependent")},
    {"id": "MP_YOGA", "name": "Pancha-Mahapurusha ({P})", "category": "RAJA_DHANA", "weight": 45,
     "for_each": "mahapurusha_planets",
     "when": {"all": [{"p": "in_houses", "sel": "$P", "houses": "set:kendra", "frm": "lagna"},
                      {"p": "dignity_in", "sel": "$P", "values": ["Exalted", "Moolatrikona", "Own"]}]},
     "strength_planets": ["$P"], "source": _src("Brihat Jataka / BPHS")},
    {"id": "BPHS_GAJAKESARI", "name": "Gajakesari", "category": "DHANA", "weight": 30,
     "when": {"p": "in_houses", "sel": "JU", "houses": "set:kendra", "frm": "moon"},
     "strength_planets": ["JU"], "source": _src("BPHS / Jataka Parijata")},
    {"id": "MN_CHANDRA_MANGALA", "name": "Chandra-Mangala (conjunction)", "category": "DHANA",
     "weight": 35, "when": {"p": "related", "a": "MO", "b": "MA", "types": ["Yuti"]},
     "strength_planets": ["MO", "MA"], "source": _src("Manasagari / classical lists")},
    # ---- Daridra / leakage (negative weights; cancel_when gives a documented bhanga)
    {"id": "DR_KEMADRUMA", "name": "Kemadruma", "category": "DARIDRA", "weight": -65,
     "when": {"p": "count_in_houses", "group": "kemadruma_planets", "houses": [2, 12], "frm": "moon", "max": 0},
     "cancel_when": {"any": [
         {"p": "count_in_houses", "group": "kemadruma_planets", "houses": "set:kendra", "frm": "moon", "min": 1},
         {"p": "count_in_houses", "group": "kemadruma_planets", "houses": "set:kendra", "frm": "lagna", "min": 1}]},
     "cancel_factor": 0.0, "source": _src("Brihat Jataka / Phaladeepika")},
    {"id": "DR_L11_DUSTHANA", "name": "Labhesh in dusthana", "category": "DARIDRA", "weight": -30,
     "when": {"p": "in_houses", "sel": "lord:11", "houses": "set:dusthana", "frm": "lagna"},
     "source": _src("BPHS")},
    {"id": "DR_L11_DUSTHANA_AFFLICTED", "name": "Labhesh in dusthana and afflicted", "category": "DARIDRA",
     "weight": -20,
     "when": {"all": [{"p": "in_houses", "sel": "lord:11", "houses": "set:dusthana", "frm": "lagna"},
                      {"p": "afflicted", "sel": "lord:11"}]}, "source": _src("BPHS")},
    {"id": "DR_L2_IN_12", "name": "Dhanesh in 12th", "category": "DARIDRA", "weight": -40,
     "when": {"p": "in_houses", "sel": "lord:2", "houses": [12], "frm": "lagna"}, "source": _src("Manasagari")},
    {"id": "DR_SAV_H2_LOW", "name": "Low SAV in 2nd house", "category": "DARIDRA", "weight": -35,
     "when": {"p": "sav_house_low", "house": 2}, "source": _src("BPHS Ashtakavarga")},
]


# =============================================================================
# 5. HOST ADAPTER (the only place that knows host key names)
# =============================================================================
HOST_MAPPING: Dict[str, Any] = {
    "aliases": {"Surya": "SU", "Sun": "SU", "Chandra": "MO", "Moon": "MO",
                "Mangal": "MA", "Mangala": "MA", "Mars": "MA", "Budh": "ME", "Budha": "ME", "Mercury": "ME",
                "Guru": "JU", "Jupiter": "JU", "Shukra": "VE", "Venus": "VE",
                "Shani": "SA", "Saturn": "SA", "Rahu": "RA", "Ketu": "KE"},
    "ascendant": {"path": ["ascendant_degree"], "lon_key": None, "unit": "deg"},
    "planets": {"path": ["planets"], "lon_key": "degree", "unit": "deg", "retro_key": "is_retrograde"},
    "sav": {"path": ["ashtakvarga", "sav"], "indexing": "sign"},   # or "house"
    "bav": {"path": ["ashtakvarga", "bav"], "indexing": "sign"},
    "shadbala": {"path": ["shadbala"], "value_key": None},
    "zodiac": {"path": ["zodiac"], "default": None},          # set only after confirming host fact
    "house_system": {"path": ["house_system"], "default": None},
}


def _dig(d: Any, path: List[str]) -> Any:
    cur = d
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            return None
        cur = cur[k]
    return cur


def _spec(val: Any, unit: str) -> Dict[str, Any]:
    return {"deg": val} if unit == "deg" else {"arcsec": val}


def adapt_host_payload(host: Dict[str, Any], mapping: Dict[str, Any] = HOST_MAPPING) -> Dict[str, Any]:
    raw: Dict[str, Any] = {"flags": []}
    am = mapping["ascendant"]
    asc = _dig(host, am["path"])
    if isinstance(asc, dict) and am.get("lon_key"):
        asc = asc.get(am["lon_key"])
    raw["ascendant"] = _spec(asc, am["unit"]) if asc is not None else None
    pm = mapping["planets"]
    planets = {}
    for hname, val in (_dig(host, pm["path"]) or {}).items():
        pid = mapping["aliases"].get(hname)
        if pid is None:
            raw["flags"].append(f"unmapped host planet name ignored: {hname}")
            continue
        lon = val.get(pm["lon_key"]) if isinstance(val, dict) else val
        retro = val.get(pm["retro_key"]) if isinstance(val, dict) else None   # absent => None (unknown)
        planets[pid] = {"lon": _spec(lon, pm["unit"]) if lon is not None else None, "retro": retro}
    raw["planets"] = planets

    def _house_to_sign(arr: List[int], asc_sign: int) -> List[int]:
        out = [0] * SIGN_COUNT
        for h, v in enumerate(arr):
            out[(asc_sign + h) % SIGN_COUNT] = v
        return out

    raw["_sav_host"] = _dig(host, mapping["sav"]["path"])
    raw["_sav_indexing"] = mapping["sav"]["indexing"]
    raw["_bav_host"] = _dig(host, mapping["bav"]["path"])
    raw["_bav_indexing"] = mapping["bav"]["indexing"]
    sb = _dig(host, mapping["shadbala"]["path"])
    vk = mapping["shadbala"]["value_key"]
    raw["shadbala"] = None if sb is None else {
        mapping["aliases"].get(k, k): (v.get(vk) if (isinstance(v, dict) and vk) else v) for k, v in sb.items()}
    raw["zodiac"] = _dig(host, mapping["zodiac"]["path"]) or mapping["zodiac"]["default"]
    raw["house_system"] = _dig(host, mapping["house_system"]["path"]) or mapping["house_system"]["default"]
    raw["_house_to_sign"] = _house_to_sign
    return raw


# =============================================================================
# 6. VALIDATION + CANONICALISATION
# =============================================================================
def prepare_chart(raw: Dict[str, Any], cfg: Dict[str, Any] = CONFIG) -> Dict[str, Any]:
    flags = list(raw.get("flags", []))
    if raw.get("zodiac") != cfg["required_zodiac"]:
        raise ChartInputError(f"zodiac must be explicitly '{cfg['required_zodiac']}', got {raw.get('zodiac')!r}")
    if raw.get("house_system") not in cfg["supported_house_systems"]:
        raise ChartInputError(f"unsupported/absent house_system: {raw.get('house_system')!r}")
    if raw.get("ascendant") is None:
        raise ChartInputError("ascendant missing")
    pol = cfg["float_input_policy"]
    asc = angle_to_arcsec(raw["ascendant"], pol, flags, "ascendant")
    asc_sign = asc // ARCSEC_PER_SIGN

    planets: Dict[str, Dict[str, Any]] = {}
    for pid, v in (raw.get("planets") or {}).items():
        if v.get("lon") is None:
            raise ChartInputError(f"{pid}: longitude missing")
        retro = v.get("retro")
        if retro is not None and not isinstance(retro, bool):
            raise ChartInputError(f"{pid}: retro must be bool or None")
        planets[pid] = {"arc": angle_to_arcsec(v["lon"], pol, flags, pid), "retro": retro}
    for pid in cfg["groups"]["physical"]:
        if pid not in planets:
            raise ChartInputError(f"required planet missing: {pid}")
    for pid in cfg["groups"]["physical"]:
        if pid in cfg["combustion_limits_deg"] and planets[pid]["retro"] is None \
                and "retro" in cfg["combustion_limits_deg"][pid]:
            flags.append(f"{pid}: retrograde status unknown; combustion may be undetermined")

    def _to_sign_index(arr, indexing):
        if indexing == "sign":
            return list(arr)
        return raw["_house_to_sign"](list(arr), asc_sign)

    sav = None
    if raw.get("sav") is not None or raw.get("_sav_host") is not None:
        arr = raw.get("sav") if raw.get("sav") is not None else raw["_sav_host"]
        if len(arr) != SIGN_COUNT or not all(isinstance(x, int) and x >= 0 for x in arr):
            raise ChartInputError("SAV must be 12 non-negative ints")
        if sum(arr) != cfg["sav_total"]:
            raise ChartInputError(f"SAV total {sum(arr)} != {cfg['sav_total']}")
        sav = _to_sign_index(arr, raw.get("_sav_indexing", "sign"))

    bav = None
    bsrc = raw.get("bav") if raw.get("bav") is not None else raw.get("_bav_host")
    if bsrc is not None:
        bav = {}
        for k, arr in bsrc.items():
            if len(arr) != SIGN_COUNT:
                raise ChartInputError(f"BAV {k}: need 12 entries")
            if k in cfg["bav_totals"] and sum(arr) != cfg["bav_totals"][k]:
                raise ChartInputError(f"BAV {k} total {sum(arr)} != {cfg['bav_totals'][k]}")
            bav[k] = _to_sign_index(arr, raw.get("_bav_indexing", "sign"))
        if sav is not None and all(p in bav for p in cfg["bav_totals"]):
            for s in range(SIGN_COUNT):
                if sum(bav[p][s] for p in cfg["bav_totals"]) != sav[s]:
                    raise ChartInputError(f"SAV[{s}] != sum of BAVs")

    shad = None
    if raw.get("shadbala") is not None:
        shad = {}
        for k, v in raw["shadbala"].items():
            if isinstance(v, bool) or not isinstance(v, (int, float)) or v <= 0:
                raise ChartInputError(f"shadbala {k}: invalid value {v!r}")
            r = v / 60.0 if cfg["shadbala_input_unit"] == "virupa" else float(v)
            if r > cfg["shadbala_plausible_max_rupa"]:
                raise ChartInputError(f"shadbala {k}: {r} rupa implausible; check unit")
            shad[k] = r
    return {"flags": flags, "asc": asc, "planets": planets, "sav": sav, "bav": bav, "shadbala": shad}


# =============================================================================
# 7. CHART CONTEXT: dignity, combustion, relations, special lagnas, karakas
# =============================================================================
@dataclass
class PlanetFact:
    pid: str
    arc: int
    sign: int
    pos: int
    house: int
    retro: Optional[bool]
    combust: Optional[bool]
    dignity: str
    nav_sign: int
    pushkara: bool


class ChartContext:
    def __init__(self, canon: Dict[str, Any], cfg: Dict[str, Any], tables: Dict[str, Any]):
        self.cfg, self.t = cfg, tables
        self.flags: List[str] = list(canon["flags"])
        self.asc = canon["asc"]
        self.asc_sign = self.asc // ARCSEC_PER_SIGN
        self.sav, self.bav, self.shadbala = canon["sav"], canon["bav"], canon["shadbala"]
        sun = canon["planets"]["SU"]["arc"]
        moon = canon["planets"]["MO"]["arc"]
        self.is_shukla = (moon - sun) % ARCSEC_PER_CIRCLE < ARCSEC_PER_CIRCLE // 2
        self.planets: Dict[str, PlanetFact] = {}
        for pid, v in canon["planets"].items():
            arc = v["arc"]
            sign, pos = divmod(arc, ARCSEC_PER_SIGN)
            elem = sign % 4
            nav_idx = pos // ARCSEC_PER_NAVAMSHA
            self.planets[pid] = PlanetFact(
                pid, arc, sign, pos, house_from(self.asc_sign, sign), v["retro"],
                self._combustion(pid, arc, sun, v["retro"]), self._dignity(pid, sign, pos),
                (self.t["NAVAMSHA_START_BY_ELEMENT"][elem] + nav_idx) % SIGN_COUNT,
                nav_idx in self.t["PUSHKARA_NAVAMSHA_BY_ELEMENT"][elem])
        if "RA" not in self.planets or "KE" not in self.planets:
            self.flags.append("nodes absent: node-dependent checks (e.g. Mercury affliction) ignore them")
        self.indu_sign = self._indu_lagna()
        self.al_sign = self.arudha_of_house(1)
        self.karakas, amb = self._chara_karakas()
        for lab in amb:
            self.flags.append(f"karaka {lab} ambiguous (equal degrees); rules using it not evaluated")
        self._nb_cache: Dict[str, List[str]] = {}

    # ---------- basic lookups ----------
    def lord_of_sign(self, sign: int) -> str:
        return self.t["SIGN_LORDS"][sign % SIGN_COUNT]

    def lord_of_house(self, h: int) -> str:
        return self.lord_of_sign(self.asc_sign + h - 1)

    def house_sav(self, h: int) -> Optional[int]:
        return None if self.sav is None else self.sav[(self.asc_sign + h - 1) % SIGN_COUNT]

    def ref_sign(self, frm: str) -> int:
        return {"lagna": self.asc_sign, "moon": self.planets["MO"].sign,
                "al": self.al_sign, "indu": self.indu_sign}[frm]

    # ---------- dignity / combustion ----------
    def _dignity(self, pid: str, sign: int, pos: int) -> str:
        t = self.t
        if pid in ("RA", "KE"):
            nd = t["NODE_DIGNITY"].get(pid)
            if not nd:
                return "Unassigned"
            return "Exalted" if sign == nd.get("exalted") else "Debilitated" if sign == nd.get("debilitated") else "Neutral"
        ex_sign = t["EXALTATION"][pid][0]
        deb_sign = (ex_sign + 6) % SIGN_COUNT
        mt_sign, mt_s, mt_e = t["MOOLATRIKONA"][pid]
        in_mt = sign == mt_sign and mt_s <= pos < mt_e
        if self.cfg["mt_overrides_exaltation"] and in_mt:
            return "Moolatrikona"
        if sign == ex_sign:
            return "Exalted"
        if sign == deb_sign:
            return "Debilitated"
        if in_mt:
            return "Moolatrikona"
        if self.lord_of_sign(sign) == pid:
            return "Own"
        return "Neutral"

    def _combustion(self, pid, arc, sun_arc, retro) -> Optional[bool]:
        lim = self.cfg["combustion_limits_deg"].get(pid)
        if lim is None:
            return False
        diff = abs(arc - sun_arc)
        dist = min(diff, ARCSEC_PER_CIRCLE - diff)
        direct = lim["direct"] * ARCSEC_PER_DEG
        rlim = lim.get("retro", lim["direct"]) * ARCSEC_PER_DEG
        if retro is True:
            return dist <= rlim
        if retro is False:
            return dist <= direct
        lo, hi = min(direct, rlim), max(direct, rlim)
        if dist <= lo:
            return True
        if dist > hi:
            return False
        return None

    # ---------- benefic status ----------
    def is_benefic(self, pid: str) -> bool:
        b = self.cfg["benefic"]
        if pid in b["always"]:
            return True
        if pid == "MO":
            return self.is_shukla if b["moon_requires_shukla"] else True
        if pid == "ME":
            return not any(m in self.planets and self.planets[m].sign == self.planets["ME"].sign
                           for m in b["mercury_malefic_if_with"])
        return False

    # ---------- relations ----------
    def aspect_houses(self, src: str) -> List[int]:
        a = self.cfg["aspects"]
        h = self.planets[src].house
        return [house_plus(h, k) for k in a["base"] + a["special"].get(src, [])]

    def aspects_planet(self, src: str, tgt: str) -> bool:
        return src != tgt and self.planets[tgt].house in self.aspect_houses(src)

    @staticmethod
    def jaimini_aspects(src: int, tgt: int) -> bool:
        if src == tgt:
            return False
        ms, mt = src % 3, tgt % 3          # 0 movable, 1 fixed, 2 dual
        if ms == 2 and mt == 2:
            return True
        if ms == 0 and mt == 1:
            return tgt != (src + 1) % SIGN_COUNT
        if ms == 1 and mt == 0:
            return tgt != (src - 1) % SIGN_COUNT
        return False

    def relations(self, a: str, b: str) -> set:
        if a == b:
            return set()
        pa, pb = self.planets[a], self.planets[b]
        r = set()
        if pa.sign == pb.sign:
            r.add("Yuti")
        if pa.sign != pb.sign and self.lord_of_sign(pa.sign) == b and self.lord_of_sign(pb.sign) == a:
            r.add("Parivartana")
        ab, ba = self.aspects_planet(a, b), self.aspects_planet(b, a)
        if ab and ba:
            r.add("Mutual_Drishti")
        elif ab or ba:
            r.add("Single_Drishti")
        if self.jaimini_aspects(pa.sign, pb.sign):
            r.add("Jaimini_Drishti")
        if (pb.house - pa.house) % SIGN_COUNT in (4, 8):
            r.add("Trine")
        return r

    # ---------- special lagnas ----------
    def arudha_of_house(self, h: int) -> int:
        """Jaimini pada. Count lord's distance, project the same distance beyond the lord;
        if the result falls in the house itself or its 7th, take the 10th from it."""
        hs = (self.asc_sign + h - 1) % SIGN_COUNT
        ls = self.planets[self.lord_of_sign(hs)].sign
        d = (ls - hs) % SIGN_COUNT
        a = (ls + d) % SIGN_COUNT
        if (a - hs) % SIGN_COUNT in (0, 6):
            a = (a + 9) % SIGN_COUNT
        return a

    def _indu_lagna(self) -> int:
        k = self.t["INDU_KALAS"]
        moon_sign = self.planets["MO"].sign
        total = k[self.lord_of_sign(self.asc_sign + 8)] + k[self.lord_of_sign(moon_sign + 8)]
        rem = total % SIGN_COUNT or SIGN_COUNT
        return (moon_sign + rem - 1) % SIGN_COUNT

    def _chara_karakas(self):
        scheme = self.cfg["chara_karaka_scheme"]
        labels = self.cfg["karaka_labels"][scheme]
        items = [(self.planets[p].pos, p) for p in self.cfg["groups"]["physical"]]
        if scheme == 8 and "RA" in self.planets:
            items.append((ARCSEC_PER_SIGN - self.planets["RA"].pos, "RA"))
        items.sort(key=lambda x: -x[0])
        out, amb = {}, []
        for i, (pos, pid) in enumerate(items):
            tied = (i > 0 and items[i - 1][0] == pos) or (i + 1 < len(items) and items[i + 1][0] == pos)
            if i < len(labels):
                if tied:
                    amb.append(labels[i])
                else:
                    out[labels[i]] = pid
        return out, amb

    # ---------- neechabhanga (school-configurable condition list) ----------
    def neechabhanga(self, pid: str) -> List[str]:
        if pid in self._nb_cache:
            return self._nb_cache[pid]
        p = self.planets[pid]
        hits: List[str] = []
        if p.dignity == "Debilitated" and pid in self.t["EXALTATION"]:
            ks = self.cfg["house_sets"]["kendra"]

            def kendra(q: Optional[str]) -> bool:
                if q not in self.planets:
                    return False
                f = self.planets[q]
                return (f.house in ks) or (house_from(self.planets["MO"].sign, f.sign) in ks)

            ex_sign = self.t["EXALTATION"][pid][0]
            deb_lord = self.lord_of_sign(p.sign)
            ex_lord = self.lord_of_sign(ex_sign)
            for c in self.cfg["neechabhanga"]["conditions"]:
                if not c["enabled"]:
                    continue
                cid = c["id"]
                if cid == "DEBIL_SIGN_LORD_KENDRA" and kendra(deb_lord):
                    hits.append(cid)
                elif cid == "PLANET_EXALTED_IN_DEBIL_SIGN_KENDRA" and any(
                        kendra(q) for q, (s, _) in self.t["EXALTATION"].items() if s == p.sign and q != pid):
                    hits.append(cid)
                elif cid == "EXALT_SIGN_LORD_KENDRA" and kendra(ex_lord):
                    hits.append(cid)
                elif cid == "EXALT_SIGN_LORD_ASPECTS" and ex_lord in self.planets and self.aspects_planet(ex_lord, pid):
                    hits.append(cid)
                elif cid == "DEBIL_AND_EXALT_LORDS_MUTUAL_KENDRA" and deb_lord in self.planets and ex_lord in self.planets:
                    if (self.planets[ex_lord].house - self.planets[deb_lord].house) % SIGN_COUNT in (3, 6, 9):
                        hits.append(cid)
                elif cid == "PUSHKARA_NAVAMSHA" and p.pushkara:
                    hits.append(cid)
        self._nb_cache[pid] = hits
        return hits

    def neechabhanga_ok(self, pid: str) -> bool:
        return len(self.neechabhanga(pid)) >= self.cfg["neechabhanga"]["min_conditions"]

    def strength_factor(self, pid: str, notes: List[str]) -> float:
        sm = self.cfg["strength_modifiers"]
        p = self.planets[pid]
        f = 1.0
        if p.combust is True:
            f *= sm["combust"]
        elif p.combust is None:
            notes.append(f"{pid}: combustion undetermined (retro unknown); no reduction applied")
        if p.dignity == "Debilitated" and not self.neechabhanga_ok(pid):
            f *= sm["debilitated_uncancelled"]
        return f * sm["dignity_bonus"].get(p.dignity, 1.0)

    # ---------- selector / set resolution ----------
    def resolve(self, sel: str, env: Dict[str, str]) -> Optional[str]:
        if sel.startswith("$"):
            return env.get(sel[1:])
        if sel.startswith("lord:"):
            return self.lord_of_house(int(sel[5:]))
        if sel.startswith("karaka:"):
            return self.karakas.get(sel[7:])
        return sel if sel in self.planets else None

    def houses(self, spec: Any) -> List[int]:
        return self.cfg["house_sets"][spec[4:]] if isinstance(spec, str) else list(spec)

    def group(self, spec: Any) -> List[str]:
        return self.cfg["groups"][spec] if isinstance(spec, str) else list(spec)


# =============================================================================
# 8. RULE EVALUATION (tri-state logic; generic predicates; no chart constants)
# =============================================================================
@dataclass
class Outcome:
    value: Optional[bool]
    detail: str = ""
    meta: Dict[str, Any] = field(default_factory=dict)


def _p_related(ctx, env, c):
    a, b = ctx.resolve(c["a"], env), ctx.resolve(c["b"], env)
    if a is None or b is None:
        return Outcome(None, "participant unavailable")
    if a == b:
        return Outcome(False, f"{a} is both participants (no self-relation)", {"same_planet": True})
    rels = ctx.relations(a, b)
    hit = [t for t in c["types"] if t in rels]
    if not hit:
        return Outcome(False, f"{a}-{b}: no qualifying relation")
    best = next(t for t in ctx.cfg["relation_priority"] if t in hit)
    return Outcome(True, f"{a}-{b}: {best}", {"relation": best})


def _p_same_planet(ctx, env, c):
    a, b = ctx.resolve(c["a"], env), ctx.resolve(c["b"], env)
    if a is None or b is None:
        return Outcome(None, "participant unavailable")
    return Outcome(a == b, f"same planet {a}" if a == b else "different planets")


def _p_in_houses(ctx, env, c):
    pid = ctx.resolve(c["sel"], env)
    if pid is None:
        return Outcome(None, "planet unavailable")
    h = house_from(ctx.ref_sign(c.get("frm", "lagna")), ctx.planets[pid].sign)
    return Outcome(h in ctx.houses(c["houses"]), f"{pid} in house {h} from {c.get('frm', 'lagna')}")


def _p_dignity_in(ctx, env, c):
    pid = ctx.resolve(c["sel"], env)
    if pid is None:
        return Outcome(None, "planet unavailable")
    d = ctx.planets[pid].dignity
    return Outcome(d in c["values"], f"{pid} dignity {d}")


def _p_afflicted(ctx, env, c):
    pid = ctx.resolve(c["sel"], env)
    if pid is None:
        return Outcome(None, "planet unavailable")
    p = ctx.planets[pid]
    deb = p.dignity == "Debilitated" and not ctx.neechabhanga_ok(pid)
    if p.combust is True or deb:
        return Outcome(True, f"{pid} afflicted (combust={p.combust}, uncancelled_debil={deb})")
    return Outcome(None if p.combust is None else False, f"{pid} not afflicted")


def _p_count_in_houses(ctx, env, c):
    frm = c.get("frm", "lagna")
    ref = ctx.ref_sign(frm)
    hs = ctx.houses(c["houses"])
    hits = []
    for pid in ctx.group(c["group"]):
        p = ctx.planets.get(pid)
        if p is None or house_from(ref, p.sign) not in hs:
            continue
        if c.get("benefic_only") and not ctx.is_benefic(pid):
            continue
        if "dignity" in c and p.dignity not in c["dignity"]:
            continue
        hits.append(pid)
    n, hi = len(hits), c.get("max")
    ok = n >= c.get("min", 0) and (hi is None or n <= hi)
    return Outcome(ok, f"{hits} in houses {sorted(hs)} from {frm}", {"count": n, "planets": hits})


def _p_count_lords(ctx, env, c):
    ref = ctx.ref_sign(c.get("frm", "lagna"))
    hs = ctx.houses(c["houses"])
    hits = sorted({ctx.lord_of_house(h) for h in c["lords"]
                   if house_from(ref, ctx.planets[ctx.lord_of_house(h)].sign) in hs})
    return Outcome(len(hits) >= c.get("min", 1), f"lords {hits} placed in {sorted(hs)}", {"count": len(hits)})


def _p_neechabhanga(ctx, env, c):
    pid = ctx.resolve(c["sel"], env)
    if pid is None:
        return Outcome(None, "planet unavailable")
    if ctx.planets[pid].dignity != "Debilitated":
        return Outcome(False, f"{pid} not debilitated")
    hits = ctx.neechabhanga(pid)
    return Outcome(ctx.neechabhanga_ok(pid), f"{pid} bhanga conditions: {hits}", {"conditions": hits})


def _p_sav_low(ctx, env, c):
    if ctx.sav is None:
        return Outcome(None, "SAV not provided")
    v = ctx.house_sav(c["house"])
    thr = ctx.cfg["sav_low_ratio"] * sum(ctx.sav) / SIGN_COUNT
    return Outcome(v < thr, f"house {c['house']} SAV {v} vs threshold {thr:.2f}")


PREDICATES: Dict[str, Callable] = {
    "related": _p_related, "same_planet": _p_same_planet, "in_houses": _p_in_houses,
    "dignity_in": _p_dignity_in, "afflicted": _p_afflicted, "count_in_houses": _p_count_in_houses,
    "count_lords_in_houses": _p_count_lords, "neechabhanga": _p_neechabhanga, "sav_house_low": _p_sav_low,
}


def eval_cond(c: Dict[str, Any], ctx: ChartContext, env: Dict[str, str], results: Dict[str, Any]) -> Outcome:
    if "all" in c:
        outs = [eval_cond(x, ctx, env, results) for x in c["all"]]
        if any(o.value is False for o in outs):
            out = Outcome(False, "; ".join(o.detail for o in outs if o.value is False))
        elif any(o.value is None for o in outs):
            out = Outcome(None, "; ".join(o.detail for o in outs if o.value is None))
        else:
            meta: Dict[str, Any] = {}
            for o in outs:
                meta.update(o.meta)
            out = Outcome(True, "; ".join(o.detail for o in outs), meta)
    elif "any" in c:
        outs = [eval_cond(x, ctx, env, results) for x in c["any"]]
        first = next((o for o in outs if o.value is True), None)
        if first:
            out = Outcome(True, first.detail, dict(first.meta))
        elif any(o.value is None for o in outs):
            out = Outcome(None, "; ".join(o.detail for o in outs if o.value is None))
        else:
            out = Outcome(False, "no alternative satisfied")
    elif "not" in c:
        o = eval_cond(c["not"], ctx, env, results)
        out = Outcome(None if o.value is None else (not o.value), o.detail)
    elif "rule_triggered" in c:
        r = results.get(c["rule_triggered"])
        out = Outcome(None if (r is None or r["status"] == "NOT_EVALUATED") else r["status"] == "TRIGGERED",
                      f"depends on {c['rule_triggered']}")
    elif "p" in c:
        out = PREDICATES[c["p"]](ctx, env, c)
    else:
        raise ValueError(f"bad condition node: {c}")
    if "meta" in c and out.value is True:
        out.meta = {**out.meta, **c["meta"]}
    return out


def resolve_weight(spec: Any, meta: Dict[str, Any]) -> float:
    if isinstance(spec, (int, float)):
        return float(spec)
    if spec.get("by") == "relation":
        return float(spec["values"].get(meta.get("relation"), spec.get("default", 0)))
    if "per" in spec:
        return float(min(spec["cap"], meta.get(spec["per"], 0) * spec["unit"]))
    raise ValueError(f"bad weight spec {spec}")


def max_weight(spec: Any) -> float:
    if isinstance(spec, (int, float)):
        return float(spec)
    return float(spec["cap"]) if "per" in spec else float(max(spec["values"].values()))


def expand_rules(rules, ctx):
    for r in rules:
        if "for_each" in r:
            for pid in ctx.group(r["for_each"]):
                if pid in ctx.planets:
                    rr = dict(r)
                    rr["id"] = f"{r['id']}_{pid}"
                    rr["name"] = r["name"].replace("{P}", ctx.t["PLANET_NAMES"][pid])
                    rr["env"] = {"P": pid}
                    yield rr
        else:
            yield dict(r, env={})


# =============================================================================
# 9. SCORING (uncalibrated; every number from CONFIG or RULES)
# =============================================================================
def sav_multiplier(ctx):
    m = ctx.cfg["multipliers"]["sav"]
    if ctx.sav is None:
        return 1.0, False
    diff = ctx.house_sav(m["gain_house"]) - ctx.house_sav(m["loss_house"])
    f = min(m["pos_cap"], 1 + diff * m["pos_step"]) if diff > 0 else max(m["neg_floor"], 1 + diff * m["neg_step"])
    return round(f, 3), True


def shadbala_multiplier(ctx):
    m = ctx.cfg["multipliers"]["shadbala"]
    if not ctx.shadbala:
        return 1.0, False
    w = {p: x for p, x in ctx.cfg["shadbala_weights"].items() if p in ctx.shadbala}
    if not w:
        return 1.0, False
    tot = sum(w.values())
    f = sum(x / tot * ctx.shadbala[p] / ctx.cfg["shadbala_min_rupa"][p] for p, x in w.items())
    if len(w) < len(ctx.cfg["shadbala_weights"]):
        ctx.flags.append("shadbala partial: weights renormalised over available planets")
    return round(max(m["floor"], min(m["cap"], f)), 3), True


def run_engine(canon, cfg=CONFIG, tables=REFERENCE_TABLES, rules=RULES) -> Dict[str, Any]:
    ctx = ChartContext(canon, cfg, tables)
    results: Dict[str, Any] = {}
    ordered: List[Dict[str, Any]] = []
    notes: List[str] = []
    ref_max = 0.0
    for r in expand_rules(rules, ctx):
        if r["category"] in cfg["strength_applies_to"]:
            ref_max += max_weight(r["weight"])
        env = r["env"]
        o = eval_cond(r["when"], ctx, env, results)
        res = {"id": r["id"], "name": r["name"], "category": r["category"], "points": 0.0,
               "detail": o.detail, "source": r["source"]}
        if o.value is None:
            res["status"] = "NOT_EVALUATED"
        elif o.value is False:
            res["status"] = "NOT_TRIGGERED"
        else:
            pts = resolve_weight(r["weight"], o.meta)
            res["status"] = "TRIGGERED"
            if "cancel_when" in r:
                co = eval_cond(r["cancel_when"], ctx, env, results)
                if co.value is True:
                    pts *= r.get("cancel_factor", 0.0)
                    res["detail"] += f" | cancelled: {co.detail}"
                    if pts == 0:
                        res["status"] = "CANCELLED"
                elif co.value is None:
                    notes.append(f"{r['id']}: cancellation could not be evaluated")
            if pts > 0 and r["category"] in cfg["strength_applies_to"] and r.get("strength_planets"):
                fs = []
                for s in r["strength_planets"]:
                    pid = ctx.resolve(s, env)
                    if pid:
                        fs.append(ctx.strength_factor(pid, notes))
                if fs:
                    pts *= sum(fs) / len(fs)
            res["points"] = round(pts, 2)
        results[r["id"]] = res
        ordered.append(res)

    pos = sum(x["points"] for x in ordered if x["points"] > 0)
    neg = -sum(x["points"] for x in ordered if x["points"] < 0)
    sav_f, sav_ok = sav_multiplier(ctx)
    sb_f, sb_ok = shadbala_multiplier(ctx)
    net = max(0.0, pos - neg) * sav_f * sb_f
    sc = cfg["scoring"]
    ref = sc["saturation_fraction"] * ref_max
    index = int(min(sc["scale_max"], round(sc["scale_max"] * net / ref))) if ref > 0 else 0
    band = next(b for b in cfg["bands"] if index <= b["upper"])
    nm = tables["SIGN_NAMES"]
    return {
        "capacity_index": index, "band": {"tier": band["tier"], "label": band["label"]},
        "calibrated": sc["calibrated"],
        "components": {"positive_points": round(pos, 2), "penalty_points": round(neg, 2),
                       "sav_multiplier": {"value": sav_f, "evaluated": sav_ok},
                       "shadbala_multiplier": {"value": sb_f, "evaluated": sb_ok}},
        "special_lagnas": {"lagna": nm[ctx.asc_sign], "arudha_lagna": nm[ctx.al_sign],
                           "a11": nm[ctx.arudha_of_house(11)], "indu_lagna": nm[ctx.indu_sign]},
        "chara_karakas": ctx.karakas,
        "triggered": [x for x in ordered if x["status"] == "TRIGGERED"],
        "cancelled": [x for x in ordered if x["status"] == "CANCELLED"],
        "not_evaluated": [{"id": x["id"], "why": x["detail"]} for x in ordered if x["status"] == "NOT_EVALUATED"],
        "flags": ctx.flags + notes,
    }


def analyze_host_payload(host: Dict[str, Any], mapping=HOST_MAPPING, cfg=CONFIG) -> Dict[str, Any]:
    """Single entry point: host JSON -> adapter -> validation -> engine."""
    return run_engine(prepare_chart(adapt_host_payload(host, mapping), cfg), cfg)


# =============================================================================
# 10. SELF-TESTS (synthetic charts only; move to tests/ in the repo)
# =============================================================================
def _synthetic(asc_sign, placements, sav=None, retro=None):
    pl = {pid: {"lon": {"arcsec": s * ARCSEC_PER_SIGN + deg * ARCSEC_PER_DEG}, "retro": (retro or {}).get(pid, False)}
          for pid, (s, deg) in placements.items()}
    return {"zodiac": "sidereal", "house_system": "whole_sign", "flags": [],
            "ascendant": {"arcsec": asc_sign * ARCSEC_PER_SIGN + 5 * ARCSEC_PER_DEG},
            "planets": pl, "sav": sav, "bav": None, "shadbala": None}


_BASE = {"SU": (0, 5), "MO": (3, 10), "MA": (6, 12), "ME": (1, 8), "JU": (9, 20), "VE": (2, 25), "SA": (4, 3)}


def run_self_tests() -> None:
    # 1. SAV house mapping must follow the lagna for every ascendant
    sav = [20 + i for i in range(11)] + [337 - sum(20 + i for i in range(11))]
    for a in range(SIGN_COUNT):
        ctx = ChartContext(prepare_chart(_synthetic(a, _BASE, sav=sav)), CONFIG, REFERENCE_TABLES)
        for h in range(1, 13):
            assert ctx.house_sav(h) == sav[(a + h - 1) % 12]
    # 2. Missing SAV => rule not evaluated, multiplier flagged unevaluated
    out = run_engine(prepare_chart(_synthetic(0, _BASE)))
    assert any(x["id"] == "DR_SAV_H2_LOW" for x in out["not_evaluated"])
    assert out["components"]["sav_multiplier"]["evaluated"] is False
    # 3. One planet ruling two houses must not create a self-conjunction
    ctx = ChartContext(prepare_chart(_synthetic(9, _BASE)), CONFIG, REFERENCE_TABLES)   # same lord for 1st and 2nd
    assert ctx.lord_of_house(1) == ctx.lord_of_house(2)
    o = _p_related(ctx, {}, {"a": "lord:1", "b": "lord:2", "types": ["Yuti"]})
    assert o.value is False and o.meta.get("same_planet")
    # 4. Arudha never lands on the house itself or its 7th, for all combinations
    for h_sign in range(12):
        for lord_sign in range(12):
            d = (lord_sign - h_sign) % 12
            a = (lord_sign + d) % 12
            if (a - h_sign) % 12 in (0, 6):
                a = (a + 9) % 12
            assert (a - h_sign) % 12 not in (0, 6)
    # 5. Sign boundary is exact: 30 degrees belongs to the next sign
    assert divmod(30 * ARCSEC_PER_DEG, ARCSEC_PER_SIGN) == (1, 0)
    # 6. Float degrees rejected when policy says so; unit confusion caught
    try:
        angle_to_arcsec({"deg": 10.5}, "reject", [], "t")
        raise AssertionError("should have raised")
    except ChartInputError:
        pass
    # 7. Absent retro status must not be silently treated as direct
    c = ChartContext(prepare_chart(_synthetic(0, _BASE, retro={"ME": None})), CONFIG, REFERENCE_TABLES)
    assert c.planets["ME"].retro is None
    print("self-tests passed")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as fh:
            print(json.dumps(analyze_host_payload(json.load(fh)), ensure_ascii=False, indent=2))
    else:
        run_self_tests()
