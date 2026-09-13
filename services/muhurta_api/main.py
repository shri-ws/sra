import os
from datetime import datetime, timezone
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from services.muhurta_api.yajnopavita_engine import scan_yajnopavita_window

app = FastAPI(
    title="Shri Ramji Astro - Yajñopavīta Muhūrta API",
    description="High-precision sidereal Swiss Ephemeris calculation engine for Upanayana Muhūrtas based on Muhūrta Cintāmaṇi.",
    version="1.0.0"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base path of the repository
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@app.get("/api/muhurta/yajnopavita")
def get_yajnopavita_muhurta(
    moon_sign: int = Query(..., ge=1, le=12, description="Child's natal Moon sign (1=Aries to 12=Pisces)"),
    lat: float = Query(..., ge=-90.0, le=90.0, description="Latitude"),
    lon: float = Query(..., ge=-180.0, le=180.0, description="Longitude"),
    start_date: str = Query(..., description="Search start date (YYYY-MM-DD)"),
    days: int = Query(7, ge=1, le=90, description="Scan duration in days")
):
    try:
        dt_start = datetime.strptime(start_date, "%Y-%m-%d").replace(hour=7, minute=0, second=0, tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    slots = scan_yajnopavita_window(
        start_date=dt_start,
        days=days,
        lat=lat,
        lon=lon,
        child_moon_sign=moon_sign
    )

    return {
        "status": "success",
        "moon_sign": moon_sign,
        "location": {"lat": lat, "lon": lon},
        "start_date": start_date,
        "days": days,
        "count": len(slots),
        "results": slots
    }

# Serve root static files like index.html, vmm.html, ymm.html, yajnopavita.html
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

# Mount public directory if exists
public_dir = os.path.join(BASE_DIR, "public")
if os.path.exists(public_dir):
    app.mount("/public", StaticFiles(directory=public_dir), name="public")

@app.get("/")
def get_index_page():
    filePath = os.path.join(BASE_DIR, "index.html")
    if os.path.exists(filePath):
        return FileResponse(filePath)
    return {"message": "Shri Ramji Astro Muhurta API Server is running."}
