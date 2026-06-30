from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import asyncio
import uuid
from datetime import datetime
import httpx
import PyPDF2
from docx import Document
import google.generativeai as genai
import os
import json

app = FastAPI(title="Jetski SmartHire API", version="1.0.0")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Google Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("GOOGLE_API_KEY environment variable not set")

genai.configure(api_key=api_key)

# Choose model (options: gemini-1.5-flash, gemini-1.5-pro, gemini-pro)
model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
model = genai.GenerativeModel(model_name)

# Resume screening cache
screening_results = {}


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(open('/tmp/temp.pdf', 'wb') or file_content)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        # Fallback for complex PDFs
        try:
            from io import BytesIO
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text()
            return text
        except:
            return ""


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from Word document"""
    try:
        from io import BytesIO
        doc = Document(BytesIO(file_content))
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        return ""


async def analyze_resume_with_gemini(
    resume_text: str, 
    job_description: str
) -> dict:
    """Analyze resume using Google Gemini AI"""
    
    prompt = f"""Analyze the following resume against the job description and provide a detailed screening assessment.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Please provide a JSON response with the following structure (ONLY JSON, no other text):
{{
  "score": 0-100,
  "match_percentage": 0-100,
  "status": "passed" | "failed" | "pending",
  "feedback": "Detailed feedback about the candidate",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2"]
}}

Scoring criteria:
- Score 80-100: Excellent match, candidate meets most key requirements
- Score 60-79: Good match, candidate meets some key requirements  
- Score 40-59: Partial match, candidate needs development in key areas
- Score below 40: Poor match, significant gaps in qualifications

Be specific and professional in your assessment."""

    try:
        # Call Gemini API
        response = model.generate_content(prompt)
        response_text = response.text
        
        # Parse JSON response
        import re
        
        # Extract JSON from response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            result = json.loads(json_match.group())
            return result
        else:
            raise ValueError("No JSON found in response")
            
    except Exception as e:
        print(f"Error analyzing resume with Gemini: {str(e)}")
        return {
            "score": 0,
            "match_percentage": 0,
            "status": "failed",
            "feedback": f"Error processing resume: {str(e)}",
            "strengths": [],
            "improvements": ["Unable to process resume"]
        }


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "Jetski SmartHire API",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.post("/api/screen")
async def screen_resume(
    file: UploadFile = File(...),
    job_description: str = Form(...)
):
    """Screen a resume against a job description"""
    
    try:
        # Validate inputs
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not job_description.strip():
            raise HTTPException(status_code=400, detail="No job description provided")
        
        # Validate file type
        allowed_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload PDF or Word document"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Extract text based on file type
        if file.content_type == "application/pdf":
            resume_text = extract_text_from_pdf(file_content)
        elif file.content_type in [
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]:
            resume_text = extract_text_from_docx(file_content)
        else:
            raise HTTPException(status_code=400, detail="Unable to extract text from file")
        
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Resume file appears to be empty")
        
        # Analyze with Gemini
        analysis = await analyze_resume_with_gemini(resume_text, job_description)
        
        # Create result object
        result_id = str(uuid.uuid4())
        result = {
            "id": result_id,
            "filename": file.filename,
            "score": analysis.get("score", 0),
            "match_percentage": analysis.get("match_percentage", 0),
            "status": analysis.get("status", "pending"),
            "feedback": analysis.get("feedback", ""),
            "strengths": analysis.get("strengths", []),
            "improvements": analysis.get("improvements", []),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Store result
        screening_results[result_id] = result
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error screening resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error screening resume: {str(e)}")


@app.get("/api/results")
async def get_results():
    """Get all screening results"""
    return list(screening_results.values())


@app.get("/api/results/{result_id}")
async def get_result(result_id: str):
    """Get specific screening result"""
    if result_id not in screening_results:
        raise HTTPException(status_code=404, detail="Result not found")
    return screening_results[result_id]


@app.delete("/api/results/{result_id}")
async def delete_result(result_id: str):
    """Delete screening result"""
    if result_id not in screening_results:
        raise HTTPException(status_code=404, detail="Result not found")
    
    del screening_results[result_id]
    return {"status": "deleted"}


@app.post("/api/stats")
async def get_stats():
    """Get screening statistics"""
    results = list(screening_results.values())
    
    if not results:
        return {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "average_score": 0
        }
    
    passed = sum(1 for r in results if r["status"] == "passed")
    failed = sum(1 for r in results if r["status"] == "failed")
    avg_score = sum(r["score"] for r in results) / len(results) if results else 0
    
    return {
        "total": len(results),
        "passed": passed,
        "failed": failed,
        "average_score": round(avg_score, 2)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
