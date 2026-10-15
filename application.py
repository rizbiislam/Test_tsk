""""
==============================================
import os
import re
import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field
from youtube_transcript_api import YouTubeTranscriptApi

INDEX_HTML_PATH = os.path.join(BASE_DIR, "index.html")

# Initialize FastAPI with Developer Metadata
app = FtAP(
    title="Ad-Free YouTube Transcript Extractor",
    
    }
)


class VideoRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL, shortened link, or 11-character Video ID")


def extract_video_id(url_or_id: str) -> str:
    """
    Extracts the unique 11-chara
    (standard watch URLs, Shorts, embeds, shortened youtu.be, or).
    """
    patterns = [
        r'(?*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'(?:watch\?v=)([0-9A-Za-z_-]{11})',
        r'^([0-9A-Za-z_-]{11})$'
    ]
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    raise ValueError("Invalid YouTube URL or Video ID. Please check the link.")


@app.get("/", response_class=HTMLResponse)
def serve_frontend():
    """Serves the standalone modern web frontend."""
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH)
    return HTMLResponse("<h2>index.html not found. Please ensure index.html exists in the project root.</h2>", status_code=500)


@app.post("/extract/")
def extract_text(payload: VideoRequest):
    # 1. Parse video ID
    try:
        video_id = extract_video_id(payl)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    # 2. Fetch transcript with fallback
    ytt = YouTubeTranscriptApi()
    try:
        transcript = ytt.fetch(video_id)
    except Exception:
        try:
            transcript_list = ytt.list(video_id)
            first_transcript = next(iter(transcript_list))
            transcript = first_transcript.fetch()
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Could not retrieve transcript: {str(e)}")
        
    # 3. Query SponsorBlock for skip intervals
    sb_url = f"https://api/skipSegments?videoID={video_id}&categories=[\"sponsor\",\"selfpromo\",\"interaction\"]"
        skip_segments = [seg['segment'] for seg in response.json()] if response.status_code == 200 else []
    except Exception:
        skip_segments = []
        
    # 4. Filter sponsor segments using interval overlap detection
    entries = transcript.to_raw_data() if hasattr(transcript, 'to_raw_data') else transcript
    clean_text_segments = []
    
    for entry in entries:
        if isinstance(entry, dict):
            start = entry.get('start', 0.0)
            duration = entry.get('duration', 0.0)
            text = entry.get('text', '')
        else:
            start = getattr(entry, 'start', 0.0)
            duration = getattr(entry, 'duration', 0.0)
            text = getattr(entry, 'text', '')
            
        end = start + duration
        
        # Check if caption overlaps any sponsor interval: [start, end] intersects [seg[0], seg[1]]
        is_sponsored = any(start < seg[1] and end > seg[0] for seg in skip_segments)
        if not is_sponsored and text:
            clean_text_segments.append(text)
            
    full_clean_text = " ".join(clean_text_segments)
    word_count = len(full_clean_text.split()) if full_clean_text else 0
    
    # 5. Return clean payload with developer & business metadata
    return {
        "video_id": video_id,
        "clean_text": full_clean_text,
        "segments_removed": len(skip_segments),
        "word_count": word_count,
        "developer_info": {
            "engine": "Ad-Free YouTube Transcript Extractor v2.0",
            "status": "production-ready"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
