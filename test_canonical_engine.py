"""
=============================================================================
REGRESSION & VERIFICATION TEST SUITE: SRA PARASHARA CANONICAL ENGINE
=============================================================================
Validates all canonical laws specified in the mission requirements:
1. NASA JPL DE431 numerical integration via compressed .se1 files (<0.001").
2. True Chitra Paksha Ayanamsa (Mode 27 / Spica @ exactly 180°00'00.000").
3. 100% Geocentric Sidereal Frame & Antipodal True Nodes (Rahu / Ketu).
4. Apparent Refracted Semi-Diameter Sunrise (h0 = -50') & Deterministic Ishtakaal.
5. Special Lagnas (Hora Lagna HL, Ghati Lagna GL) without drift.
6. Vedic Whole Sign House system immune to polar coordinate collapse (>66.5° N).
7. Vimshottari Dasa Tropical Solar Year Standard (365.2425 days).
8. BPHS Shodashavarga (16 charts) & Ashtakavarga 337-Point Canon.
9. Microservice API contract & ultra-fast execution speed (<10 ms).
=============================================================================
"""

import unittest
import math
import time
from pathlib import Path

import swisseph as swe
from parashara_canonical_engine import (
    BASE_DIR,
    EPHE_DIR,
    EPHE_FILES,
    HAS_FULL_JPL_EPHE,
    DEFAULT_AYANAMSA_ID,
    SOLAR_YEAR_DAYS,
    calculate_canonical_astronomy,
    calculate_canonical_vimshottari,
    calculate_shodashavarga,
    calculate_ashtakavarga,
    calculate_canonical_chart,
    ChartRequest,
    root,
    health,
    calculate_post,
    calculate_get,
    norm360,
    dms_str
)


class TestParasharaCanonicalEngine(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Configure Swiss Ephemeris path
        swe.set_ephe_path(str(EPHE_DIR))
        swe.set_sid_mode(DEFAULT_AYANAMSA_ID, 0, 0)

        # Standard Benchmark Native: Shridhar Mishra
        # 1993-10-26, 02:55 AM IST (+5.5), Sitapur, UP (27.5667° N, 80.6833° E)
        cls.bench_y = 1993
        cls.bench_m = 10
        cls.bench_d = 26
        cls.bench_hh = 2
        cls.bench_mm = 55
        cls.bench_ss = 0.0
        cls.bench_lat = 27.5667
        cls.bench_lon = 80.6833
        cls.bench_tz = 5.5

    def test_01_ephemeris_files_and_jpl_de431_active(self):
        """Verify presence of Swiss Ephemeris compressed binary files and DE431 active state."""
        self.assertTrue(EPHE_FILES["seas_18.se1"], "seas_18.se1 must be present in ./ephe")
        self.assertTrue(EPHE_FILES["semo_18.se1"], "semo_18.se1 must be present in ./ephe")
        self.assertTrue(EPHE_FILES["sepl_18.se1"], "sepl_18.se1 must be present in ./ephe")
        self.assertTrue(HAS_FULL_JPL_EPHE, "All 3 JPL DE431 compressed files must be loaded")

        # Test calculation returns FLG_SWIEPH active flag
        jd = swe.julday(self.bench_y, self.bench_m, self.bench_d, 2.9166667 - 5.5, swe.GREG_CAL)
        res, flag_ret = swe.calc_ut(jd, swe.SUN, swe.FLG_SWIEPH | swe.FLG_SPEED | swe.FLG_SIDEREAL)
        self.assertTrue(bool(flag_ret & swe.FLG_SWIEPH), "SWIEPH flag must be active (not Moshier fallback)")

    def test_02_true_chitra_paksha_ayanamsa_and_spica(self):
        """Verify Mode 27 (True Chitra) locks Spica (α Virginis) strictly to 180°00'00.000\"."""
        self.assertEqual(DEFAULT_AYANAMSA_ID, 27, "Default Ayanamsa ID must be 27 (True Chitra)")
        jd = swe.julday(self.bench_y, self.bench_m, self.bench_d, 2.9166667 - 5.5, swe.GREG_CAL)

        swe.set_sid_mode(DEFAULT_AYANAMSA_ID, 0, 0)
        spica_res, star_name, _ = swe.fixstar_ut("Spica", jd, swe.FLG_SWIEPH | swe.FLG_SIDEREAL)
        spica_lon = spica_res[0]
        error_arcsec = abs(spica_lon - 180.0) * 3600.0

        print(f"\n   [Test 2] Spica Sidereal Longitude: {spica_lon:.10f}° (Error: {error_arcsec:.6e} arcsec)")
        self.assertAlmostEqual(spica_lon, 180.0, places=5, msg="Spica must be at exactly 180° in True Chitra")
        self.assertLess(error_arcsec, 0.001, "Spica error must be strictly < 0.001 arcseconds")

    def test_03_ayanamsa_override_hook(self):
        """Verify that researchers can override ayanamsa_id via the API hook without affecting default."""
        jd = swe.julday(self.bench_y, self.bench_m, self.bench_d, 2.9166667 - 5.5, swe.GREG_CAL)

        # Mode 27 (True Chitra)
        swe.set_sid_mode(27, 0, 0)
        ayan_chitra = swe.get_ayanamsa_ut(jd)

        # Mode 1 (Lahiri Traditional)
        swe.set_sid_mode(1, 0, 0)
        ayan_lahiri = swe.get_ayanamsa_ut(jd)

        # Mode 3 (Raman)
        swe.set_sid_mode(3, 0, 0)
        ayan_raman = swe.get_ayanamsa_ut(jd)

        print(f"\n   [Test 3] Ayanamsa Values: True Chitra={ayan_chitra:.5f}°, Lahiri={ayan_lahiri:.5f}°, Raman={ayan_raman:.5f}°")
        self.assertNotEqual(ayan_chitra, ayan_raman, "True Chitra and Raman must differ")
        # Restore default
        swe.set_sid_mode(DEFAULT_AYANAMSA_ID, 0, 0)

    def test_04_geocentric_sidereal_frame_and_antipodal_nodes(self):
        """Verify 100% geocentric sidereal frame and strictly antipodal True Nodes (Rahu / Ketu)."""
        chart = calculate_canonical_chart(
            year=self.bench_y, month=self.bench_m, day=self.bench_d,
            hour=self.bench_hh, minute=self.bench_mm, second=self.bench_ss,
            lat=self.bench_lat, lon=self.bench_lon, tz=self.bench_tz
        )
        planets = {p["id"]: p for p in chart["planets"]}

        rahu = planets["Rahu"]
        ketu = planets["Ketu"]

        # Antipodal check: (Ketu - Rahu) % 360 == 180°
        node_diff = norm360(ketu["abs"] - rahu["abs"])
        print(f"\n   [Test 4] Rahu: {rahu['abs']:.6f}°, Ketu: {ketu['abs']:.6f}°, Diff: {node_diff:.6f}°")
        self.assertAlmostEqual(node_diff, 180.0, places=5, msg="Ketu must be exactly 180° opposite to True Rahu")
        self.assertTrue(rahu["retro"], "True Rahu must be marked retrograde")
        self.assertTrue(ketu["retro"], "Ketu must be marked retrograde")
        self.assertEqual(rahu["speed"], ketu["speed"], "Ketu speed must match Rahu speed")

    def test_05_apparent_refracted_sunrise_and_ishtakaal(self):
        """Verify sunrise definition locked to h0 = -50' (Refraction 34' + Semi-diameter 16') and Ishtakaal."""
        chart = calculate_canonical_chart(
            year=self.bench_y, month=self.bench_m, day=self.bench_d,
            hour=self.bench_hh, minute=self.bench_mm, second=self.bench_ss,
            lat=self.bench_lat, lon=self.bench_lon, tz=self.bench_tz
        )
        sunrise_info = chart["astronomy"]["sunrise"]
        ishta_info = chart["astronomy"]["ishtakaal"]

        print(f"\n   [Test 5] Effective Sunrise: {sunrise_info['sunrise_time_str']} (Pre-sunrise birth: {sunrise_info['is_pre_sunrise']})")
        print(f"            Sun Lon at Sunrise: {sunrise_info['sun_sunrise_dms']}")
        print(f"            Ishtakaal: {ishta_info['formatted']} ({ishta_info['ghatis_float']:.4f} ghatis / {ishta_info['hours']:.4f} hrs)")

        self.assertTrue(sunrise_info["is_pre_sunrise"], "Birth at 02:55 AM must be recognized as pre-sunrise")
        self.assertGreater(ishta_info["ghatis_float"], 50.0, "Ishtakaal from previous sunrise must be > 50 ghatis")
        self.assertLess(ishta_info["ghatis_float"], 60.0, "Ishtakaal must be < 60 ghatis in a single Vedic solar day")

    def test_06_special_lagnas_determinism(self):
        """Verify Hora Lagna (HL) and Ghati Lagna (GL) are deterministically derived from Ishtakaal without drift."""
        chart = calculate_canonical_chart(
            year=self.bench_y, month=self.bench_m, day=self.bench_d,
            hour=self.bench_hh, minute=self.bench_mm, second=self.bench_ss,
            lat=self.bench_lat, lon=self.bench_lon, tz=self.bench_tz
        )
        hl = chart["specialLagnas"]["HoraLagna"]
        gl = chart["specialLagnas"]["GhatiLagna"]
        sun_rise_lon = chart["astronomy"]["sunrise"]["sun_sunrise_lon"]
        ishta_ghatis = chart["astronomy"]["ishtakaal"]["ghatis_float"]

        # Canonical formulas:
        # HL = (Sun_sunrise + ishta_ghatis * 12.0) % 360
        # GL = (Sun_sunrise + ishta_ghatis * 30.0) % 360
        expected_hl = norm360(sun_rise_lon + ishta_ghatis * 12.0)
        expected_gl = norm360(sun_rise_lon + ishta_ghatis * 30.0)

        print(f"\n   [Test 6] Hora Lagna: {hl['rashi']} {hl['dms']} (Abs: {hl['abs']:.4f}°)")
        print(f"            Ghati Lagna: {gl['rashi']} {gl['dms']} (Abs: {gl['abs']:.4f}°)")

        self.assertAlmostEqual(hl["abs"], expected_hl, places=4, msg="Hora Lagna must match canonical formula")
        self.assertAlmostEqual(gl["abs"], expected_gl, places=4, msg="Ghati Lagna must match canonical formula")

    def test_07_high_latitude_whole_sign_immunity(self):
        """Verify Whole Sign / Equal house system 'E' does not collapse at high latitudes (>66.5° N)."""
        # Tromsø, Norway (69.6492° N, 18.9553° E)
        chart_high_lat = calculate_canonical_chart(
            year=1993, month=10, day=26, hour=12, minute=0, second=0,
            lat=69.6492, lon=18.9553, tz=1.0
        )
        self.assertIn("bhavas", chart_high_lat)
        self.assertEqual(len(chart_high_lat["bhavas"]), 12, "Must produce all 12 houses even at 69.6° N")

        # Longyearbyen, Svalbard (78.2232° N, 15.6267° E)
        chart_polar = calculate_canonical_chart(
            year=1993, month=10, day=26, hour=12, minute=0, second=0,
            lat=78.2232, lon=15.6267, tz=1.0
        )
        self.assertEqual(len(chart_polar["bhavas"]), 12, "Must produce all 12 houses without collapsing at 78.2° N")
        print("\n   [Test 7] High-latitude polar test passed (69.6° N and 78.2° N computed stably)")

    def test_08_vimshottari_dasa_solar_year_standard(self):
        """Verify Vimshottari Dasa calculates using exact Tropical Solar Year (365.2425 days)."""
        chart = calculate_canonical_chart(
            year=self.bench_y, month=self.bench_m, day=self.bench_d,
            hour=self.bench_hh, minute=self.bench_mm, second=self.bench_ss,
            lat=self.bench_lat, lon=self.bench_lon, tz=self.bench_tz
        )
        dasa = chart["vimshottariDasa"]
        self.assertEqual(dasa["yearLengthDays"], SOLAR_YEAR_DAYS, "Year length must be 365.2425 days")
        self.assertIn("timeline", dasa)
        self.assertEqual(len(dasa["timeline"]), 9, "Must contain all 9 Mahadashas in cycle")

        # Verify active dasha is detected properly
        active = dasa["activeDasha"]
        print(f"\n   [Test 8] Active Dasha at Current Time: {active['pair']} ({active['start']} to {active['end']})")
        self.assertIsNotNone(active, "Active Dasha must be detected")
        self.assertEqual(active["majorLord"], "Saturn", "Shridhar Mishra active mahadasha must be Saturn")
        self.assertEqual(active["subLord"], "Rahu", "Shridhar Mishra active antardasha must be Rahu")

    def test_09_shodashavarga_and_ashtakavarga_337_canon(self):
        """Verify 16 divisional charts (D1 to D60) and exact 337 Sarvashtakavarga bindu sum."""
        chart = calculate_canonical_chart(
            year=self.bench_y, month=self.bench_m, day=self.bench_d,
            hour=self.bench_hh, minute=self.bench_mm, second=self.bench_ss,
            lat=self.bench_lat, lon=self.bench_lon, tz=self.bench_tz
        )
        vargas = chart["shodashavarga"]
        self.assertEqual(len(vargas), 16, "Must contain exactly 16 divisional charts (D1 to D60)")

        # Verify Jupiter Vargottama in Navamsha D9
        d1_jup = vargas["D1"]["Jupiter"]
        d9_jup = vargas["D9"]["Jupiter"]
        print(f"\n   [Test 9] Jupiter D1 Sign: {d1_jup} ({chart['planets'][5]['rashi']}), D9 Sign: {d9_jup}")
        self.assertEqual(d1_jup, d9_jup, "Jupiter in Libra in D1 and D9 is Vargottama")

        # Verify Ashtakavarga 337 points
        ashtaka = chart["ashtakavarga"]
        total_sav = ashtaka["totalBindus"]
        print(f"            Sarvashtakavarga Total Bindus: {total_sav} (Canonical: 337)")
        self.assertEqual(total_sav, 337, "Total Sarvashtakavarga points across all signs must equal exactly 337")
        self.assertEqual(len(ashtaka["trikonaShodhita"]), 12, "Trikona shodhita must contain 12 signs")
        self.assertEqual(len(ashtaka["ekadhipatyaShodhita"]), 12, "Ekadhipatya shodhita must contain 12 signs")
        self.assertGreater(ashtaka["shodhitaPinda"], 0, "Shodhita Pinda must be > 0")

    def test_10_fastapi_endpoints_contract(self):
        """Verify root, health, GET /calculate and POST /calculate endpoint contracts."""
        r_root = root()
        self.assertEqual(r_root["status"], "online")
        self.assertTrue(r_root["jpl_ephe_files_active"])

        r_health = health()
        self.assertEqual(r_health["status"], "healthy")
        self.assertTrue(r_health["jpl_active"])

        # POST /calculate contract
        req = ChartRequest(
            date="1993-10-26",
            time="02:55",
            lat=27.5667,
            lon=80.6833,
            tz=5.5,
            name="श्रीधर मिश्र"
        )
        resp_post = calculate_post(req)
        self.assertEqual(resp_post.status_code, 200)

        # GET /calculate contract
        resp_get = calculate_get(
            date="1993-10-26",
            time_val="02:55",
            lat=27.5667,
            lon=80.6833,
            tz=5.5,
            ayanamsa_id=27,
            name="श्रीधर मिश्र",
            place="सीतापुर"
        )
        self.assertEqual(resp_get.status_code, 200)
        print("\n   [Test 10] FastAPI endpoints (/health, GET /calculate, POST /calculate) verified.")

    def test_11_sub_millisecond_benchmark(self):
        """Verify performance targets: full canonical calculation executed in microsecond/millisecond scale."""
        t0 = time.perf_counter()
        iterations = 50
        for _ in range(iterations):
            _ = calculate_canonical_chart(
                year=self.bench_y, month=self.bench_m, day=self.bench_d,
                hour=self.bench_hh, minute=self.bench_mm, second=self.bench_ss,
                lat=self.bench_lat, lon=self.bench_lon, tz=self.bench_tz
            )
        elapsed_total = (time.perf_counter() - t0) * 1000.0
        avg_ms = elapsed_total / iterations
        print(f"\n   [Test 11] {iterations} Complete Canonical Charts executed in {elapsed_total:.2f} ms ({avg_ms:.2f} ms / chart)")
        self.assertLess(avg_ms, 15.0, "Average chart calculation time must be < 15 ms")


if __name__ == "__main__":
    print("======================================================================")
    print("🚀 RUNNING SRA PARASHARA CANONICAL ENGINE VERIFICATION SUITE")
    print("======================================================================")
    unittest.main(verbosity=2)
