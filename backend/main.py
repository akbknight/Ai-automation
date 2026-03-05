import os
import shutil
import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
import pypdf

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = FastAPI(title="Super Sonic AI File Organizer")

# Enable CORS for local frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_snippet(file_path: Path) -> str:
    """Extracts a short 500 character snippet from text/pdf files to provide context."""
    ext = file_path.suffix.lower()
    snippet = ""
    try:
        if ext in ['.txt', '.csv', '.md', '.json', '.py', '.js', '.html', '.css', '.xml']:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                snippet = f.read(500)
        elif ext == '.pdf':
            with open(file_path, 'rb') as f:
                reader = pypdf.PdfReader(f)
                if len(reader.pages) > 0:
                    snippet = reader.pages[0].extract_text()[:500]
    except Exception:
        pass
    return snippet

class OrganizeRequest(BaseModel):
    target_dir: str

@app.post("/api/organize")
async def organize_files(req: OrganizeRequest):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        raise HTTPException(status_code=500, detail="Gemini API Key not configured in .env")
        
    genai.configure(api_key=GEMINI_API_KEY)

    try:
        target_path = Path(req.target_dir).resolve()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid directory path format")

    if not target_path.exists() or not target_path.is_dir():
        raise HTTPException(status_code=400, detail="Target directory does not exist or is not a directory")

    # Discover files inside the directory, ignoring subdirectories and hidden files
    all_files = [f for f in target_path.iterdir() if f.is_file() and not f.name.startswith('.')]
    
    if not all_files:
        return {
            "message": "No files found to organize in the specified directory.",
            "scanned": 0,
            "organized": 0,
            "categories": 0,
            "moved_log": [],
            "failed_log": []
        }

    # Grab names of up to 20 files for batch processing safety as requested
    files_to_process = []
    for i, f in enumerate(all_files):
        if i >= 20:
            break
        files_to_process.append(f)
        
    file_data = []
    for f in files_to_process:
        file_data.append({
            "name": f.name,
            "extension": f.suffix,
            "snippet": extract_snippet(f)
        })

    prompt = f"""You are an automated file organizer. Analyze these file names and categorize them into logical folders (e.g., 'Invoices', 'MBA Coursework', 'Images', 'Installers', 'Code'). Return ONLY a valid JSON object where the key is the exact file name and the value is the category folder.

Files to categorize:
{json.dumps(file_data)}
"""

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Explicitly force JSON response
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json",
            )
        )
        
        mapping = json.loads(response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI categorization generation failed: {str(e)}")

    moved_files = []
    failed_files = []
    categories_created = set()

    # Move files based on the generated AI mapping
    for file_name, folder_name in mapping.items():
        source_file = target_path / file_name
        dest_folder = target_path / folder_name
        dest_file = dest_folder / file_name

        if source_file.exists() and source_file.is_file():
            try:
                # Safely create target category directory
                dest_folder.mkdir(parents=True, exist_ok=True)
                categories_created.add(folder_name)
                
                # Perform the file move
                shutil.move(str(source_file), str(dest_file))
                
                moved_files.append({
                    "file": file_name,
                    "folder": folder_name,
                    "status": "success"
                })
            except PermissionError:
                failed_files.append({
                    "file": file_name,
                    "reason": "PermissionError (file might be open in another application)",
                    "status": "failed"
                })
            except Exception as e:
                failed_files.append({
                    "file": file_name,
                    "reason": str(e),
                    "status": "failed"
                })
        else:
            failed_files.append({
                "file": file_name,
                "reason": "File not found during move operation",
                "status": "failed"
            })

    return {
        "message": "File organization complete",
        "scanned": len(files_to_process),
        "organized": len(moved_files),
        "categories": len(categories_created),
        "moved_log": moved_files,
        "failed_log": failed_files
    }
