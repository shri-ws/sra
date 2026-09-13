import os
from datetime import datetime, timezone
from typing import Optional
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from services.muhurta_api.yajnopavita_engine import scan_yajnopavita_window, calculate_natal_kundli

app = FastAPI(
    title="Shri Ramji Astro - Yajñopavīta Muhūrta API",
    description="High-precision sidereal Swiss Ephemeris calculation engine for Upanayana Muhūrtas based on Muhūrta Cintāmaṇi.",
    version="1.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@app.get("/api/muhurta/yajnopavita")
def get_yajnopavita_muhurta(
    moon_sign: Optional[int] = Query(None, ge=1, le=12, description="Child's natal Moon sign (1-12)"),
    child_dob: Optional[str] = Query(None, description="Child's birth date (YYYY-MM-DD)"),
    child_tob: Optional[str] = Query("12:00", description="Child's birth time (HH:MM 24-hr)"),
    child_lat: Optional[float] = Query(None, description="Child's birth latitude"),
    child_lon: Optional[float] = Query(None, description="Child's birth longitude"),
    child_tz: Optional[float] = Query(5.5, description="Child's birth timezone offset in hours"),
    lat: float = Query(26.8467, ge=-90.0, le=90.0, description="Muhurta search location latitude"),
    lon: float = Query(80.9462, ge=-180.0, le=180.0, description="Muhurta search location longitude"),
    start_date: str = Query(..., description="Search start date (YYYY-MM-DD)"),
    days: int = Query(30, ge=1, le=90, description="Scan duration in days")
):
    natal_summary = None

    # Calculate Natal Kundli if DOB and location provided
    if child_dob and child_lat is not None and child_lon is not None:
        try:
            natal_summary = calculate_natal_kundli(
                dob_str=child_dob,
                tob_str=child_tob or "12:00",
                lat=child_lat,
                lon=child_lon,
                tz_offset_hours=child_tz or 5.5
            )
            moon_sign = natal_summary["moon_sign"]
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error calculating Child's Natal Kundli: {str(e)}")

    if not moon_sign:
        # Default to Aries if neither moon_sign nor birth details provided
        moon_sign = 1

    try:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=7, minute=0, second=0, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format for start_date. Expected YYYY-MM-DD.")

    slots = scan_yajnopavita_window(
        start_date=dt_start,
        days=days,
        lat=lat,
        lon=lon,
        child_moon_sign=moon_sign
    )

    return {
        "status": "success",
        "natal_kundli": natal_summary,
        "moon_sign": moon_sign,
        "location": {"lat": lat, "lon": lon},
        "start_date": start_date,
        "days": days,
        "count": len(slots),
        "results": slots
    }

@app.get("/ymm.html")
def get_ymm_page():
    filePath = os.path.join(BASE_DIR, "ymm.html")
    if os.path.exists(filePath):
        return FileResponse(filePath)
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/yajnopavita.html")
def get_yajnopavita_page():
    filePath = os.path.join(BASE_DIR, "yajnopavita.html")
    if os.path.exists(filePath):
        return FileResponse(filePath)
    raise HTTPException(status_code=404, detail="File not found")

@app.get("/muhurta/yajnopavita.html")
def get_muhurta_yajnopavita_page():
    filePath = os.path.join(BASE_DIR, "public", "muhurta", "yajnopavita.html")
    if os.path.exists(filePath):
        return FileResponse(filePath)
    filePathAlt = os.path.join(BASE_DIR, "yajnopavita.html")
    if os.path.exists(filePathAlt):
        return FileResponse(filePathAlt)
    raise HTTPException(status_code=404, detail="File not found")

public_dir = os.path.join(BASE_DIR, "public")
if os.path.exists(public_dir):
    app.mount("/public", StaticFiles(directory=public_dir), name="public")

@app.get("/")
def get_index_page():
    filePath = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(filePath):
        return FileResponse(filePath)
    return {"message": "Shri Ramji Astro Muhurta API Server is running."}
