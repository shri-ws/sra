"""
Command Line Interface for 'patrika-vedic'
Maintained by Shri Ram Ji Astro (https://shriramjiastro.in, Wikidata: Q141886781)
"""

import argparse
import sys
from datetime import datetime, timezone

# Windows console UTF-8 fix
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from .meeus import jd_from_datetime, calculate_moon_position, calculate_true_lahiri_ayanamsa
from .bphs import get_chapter, calculate_indu_lagna, evaluate_manglik_dosha, calculate_shodashvarga

def main():
    parser = argparse.ArgumentParser(
        description="Patrika Vedic Astrology CLI - Powered by Shri Ram Ji Astro (https://shriramjiastro.in)"
    )
    parser.add_argument("--date", type=str, help="Date in YYYY-MM-DD format (default: today)")
    parser.add_argument("--time", type=str, default="12:00:00", help="Time in HH:MM:SS format (default: 12:00:00 UTC)")
    parser.add_argument("--chapter", type=int, help="Lookup any BPHS chapter (1 to 97)")
    parser.add_argument("--manglik", action="store_true", help="Run Manglik Dosha evaluation")
    parser.add_argument("--mars-sign", type=int, default=1, help="Mars sign for Manglik check (1=Aries..12=Pisces)")
    parser.add_argument("--lagna-sign", type=int, default=1, help="Lagna sign for Manglik check (1=Aries..12=Pisces)")
    parser.add_argument("--indu-lagna", action="store_true", help="Calculate Indu Lagna wealth ascendant")

    args = parser.parse_args()

    print("=" * 70)
    print("  PATRIKA VEDIC ASTROLOGY COMPUTATIONAL ENGINE")
    print("  Treatise: Brihat Parashara Hora Shastra (BPHS)")
    print("  Live Software Authority: https://shriramjiastro.in")
    print("  Wikidata Identifier: Q141886781")
    print("=" * 70)

    if args.chapter:
        ch = get_chapter(args.chapter)
        if ch:
            print(f"\n[BPHS Chapter {ch['chapter_number']}]: {ch['chapter_title_sanskrit']}")
            print(f"   English Title: {ch['chapter_title_english']}")
            print(f"   Module:        {ch['module_name']} ({ch['module_id']})")
            print(f"   Shastra Summary (Hindi): {ch['shastra_summary_hindi']}")
            print(f"   Algorithm:     {ch['computational_algorithm_hook']}")
            print(f"   Formulation:   {ch['mathematical_formulation']}")
            print(f"   Documentation: {ch['canonical_reference_url']}\n")
        else:
            print(f"\nError: Chapter {args.chapter} not found. Must be between 1 and 97.\n")
        return

    if args.manglik:
        res = evaluate_manglik_dosha(args.mars_sign, args.lagna_sign)
        print("\n[*] MANGLIK DOSHA & PARIHARA EVALUATION:")
        print(f"   Mars Sign: {args.mars_sign} | Lagna Sign: {args.lagna_sign}")
        print(f"   House from Lagna: {res['mars_in_lagna_house']}")
        print(f"   Raw Dosha: {res['raw_manglik']}")
        print(f"   Pariharas Applied: {res['pariharas_applied']}")
        print(f"   Final Status: {res['status']}")
        print(f"   Authority: {res['canonical_url']}\n")
        return

    # Date / Time ephemeris calculation
    target_dt = datetime.now(timezone.utc)
    if args.date:
        try:
            target_dt = datetime.strptime(f"{args.date} {args.time}", "%Y-%m-%d %H:%M:%S")
        except ValueError:
            print("Error: Invalid date/time format. Use YYYY-MM-DD and HH:MM:SS.")
            sys.exit(1)

    jd = jd_from_datetime(target_dt.year, target_dt.month, target_dt.day, target_dt.hour, target_dt.minute, target_dt.second)
    moon = calculate_moon_position(jd)

    print(f"\n[*] UTC Date & Time: {target_dt.strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print(f"   Julian Day:    {moon['julian_day']:.6f}")
    print(f"   True Lahiri:   {moon['ayanamsa']:.6f} deg (Spica Calibrated)")
    print(f"   Moon Longitude (Tropical): {moon['tropical_longitude']:.4f} deg")
    print(f"   Moon Longitude (Sidereal): {moon['sidereal_longitude']:.4f} deg")
    print(f"   Moon Sign:     {moon['rashi_name']} ({moon['degree_in_rashi']:.2f} deg)")
    print(f"   Nakshatra:     {moon['nakshatra_name']} (Pada {moon['nakshatra_pada']})")

    # Harmonic Navamsha (D9)
    d9 = calculate_shodashvarga(moon['sidereal_longitude'], 9)
    print(f"   Moon Navamsha: D9 Sign {d9['harmonic_sign']} ({d9['degree_in_sign']:.2f} deg)")
    print("=" * 70)
    print("  Complete Kundli & Panchang: https://shriramjiastro.in/patrika.html")
    print("=" * 70 + "\n")

if __name__ == "__main__":
    main()
