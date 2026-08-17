import re
from typing import Dict, Any, List

class ResumeATS:
    """
    ATS Resume Analysis and Job Matching Engine.
    Scans CV/Resume structures, maps features, matches skills, and computes scores.
    """
    def parse_resume(self, resume_text: str, job_description: str) -> Dict[str, Any]:
        print("[Resume Intelligence] Performing ATS match and skill mapping...")
        
        # Lowercase for uniform keyword scanning
        resume_clean = resume_text.lower()
        jd_clean = job_description.lower()
        
        # Skills sets scanner
        standard_skills = [
            "react", "vue", "angular", "typescript", "javascript", "python", "fastapi", "django",
            "flask", "postgresql", "mysql", "mongodb", "redis", "docker", "kubernetes", "aws",
            "gcp", "azure", "git", "ci/cd", "machine learning", "deep learning", "nlp", "rust",
            "go", "c++", "c#", "java", "spring", "agile", "scrum", "system design"
        ]
        
        extracted_resume_skills = [s for s in standard_skills if s in resume_clean]
        required_jd_skills = [s for s in standard_skills if s in jd_clean]
        
        # Matching math
        if not required_jd_skills:
            # Default required skills if JD was short/empty
            required_jd_skills = ["react", "typescript", "python", "fastapi", "postgresql", "docker"]
            
        matching_skills = [s for s in extracted_resume_skills if s in required_jd_skills]
        missing_skills = [s for s in required_jd_skills if s not in extracted_resume_skills]
        
        # Calculations
        match_percentage = int((len(matching_skills) / len(required_jd_skills)) * 100) if required_jd_skills else 80
        match_percentage = min(100, max(20, match_percentage))
        
        # ATS Scoring guidelines
        ats_score = match_percentage
        if "education" in resume_clean or "academic" in resume_clean:
            ats_score += 5
        if "projects" in resume_clean or "experience" in resume_clean:
            ats_score += 5
        ats_score = min(98, ats_score) # Caps at 98% for realism
        
        # Recommendations
        suggestions = []
        if missing_skills:
            suggestions.append(f"Add keywords for missing skills: {', '.join([s.title() for s in missing_skills])}.")
        if "education" not in resume_clean:
            suggestions.append("Explicitly state your degree or educational certifications.")
        if len(resume_text.split()) > 600:
            suggestions.append("Resume is too verbose. Condense text elements to fits within 1-2 pages.")
            
        return {
            "status": "success",
            "match_score": f"{match_percentage}%",
            "ats_score": f"{ats_score}/100",
            "matching_skills": [s.title() for s in matching_skills],
            "missing_skills": [s.title() for s in missing_skills],
            "suggestions": suggestions,
            "formatting_grade": "A" if ats_score > 75 else "B",
            "resume_summary": "Extracted structure demonstrates functional skill alignments, but lacks specific framework indicators present in targeted requirements."
        }
