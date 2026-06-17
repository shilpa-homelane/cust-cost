from typing import Protocol, List, Optional
from io import BytesIO
import json
import os
from google import genai
from google.genai import types
from app.schemas.extraction import UnitExtraction, UnitDimensions, UnitCounts, UnitFinishes, UnitHardware
from app.extraction.prompt import EXTRACTION_SYSTEM_PROMPT

class VisionLLMProvider(Protocol):
    def extract_from_images(self, images: List[BytesIO], notes: Optional[str] = None) -> UnitExtraction:
        ...

class MockProvider:
    def extract_from_images(self, images: List[BytesIO], notes: Optional[str] = None) -> UnitExtraction:
        # Returns a hardcoded UnitExtraction for testing the pipeline
        return UnitExtraction(
            document_classification={
                "pdf_type": "structured_detail_sheet",
                "num_units_described": 1,
                "brand": "DesignCafe"
            },
            human_readable_summary="Identified a standard Wardrobe unit. Assumed carcass material is BWP Ply based on handwritten annotation. No secondary shutter finish was specified.",
            unit_identification={"room": "Master Bedroom", "unit_id": "MB-01"},
            archetype="wardrobe",
            dimensions=UnitDimensions(length_mm=1200, height_mm=2100, carcass_depth_mm=600),
            counts=UnitCounts(shutters=2, drawers=0),
            finishes=UnitFinishes(carcass_material="BWP Ply", shutter_finish_primary="Laminate"),
            hardware=UnitHardware(handle_sku="standard", hinge_type="soft_close"),
            premium_features=[],
            consistency_warnings=[],
            missing_information=["shutter_finish_secondary"]
        )

class ClaudeProvider:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        
    def extract_from_images(self, images: List[BytesIO], notes: Optional[str] = None) -> UnitExtraction:
        # Stub for actual anthropic SDK call
        raise NotImplementedError("Claude provider requires active API key configuration.")

class GeminiProvider:
    def __init__(self, api_key: str = None):
        # We no longer require an API key since the local CLI binary handles authentication/session
        self.default_model = "gemini-3.5-flash"
        
    def extract_from_images(self, images: List[BytesIO], notes: Optional[str] = None) -> UnitExtraction:
        import subprocess
        from pathlib import Path
        
        # 1. Create a local temp directory inside the workspace (complying with sandboxing rules)
        workspace_dir = Path(__file__).resolve().parents[2] # parents[2] is backend/
        temp_dir = workspace_dir / "temp_images"
        temp_dir.mkdir(exist_ok=True)
        
        temp_files = []
        try:
            # Save the BytesIO images to disk using absolute paths
            for idx, img in enumerate(images):
                temp_file = temp_dir / f"extract_temp_{idx}_{os.getpid()}.jpg"
                temp_file.write_bytes(img.getvalue())
                temp_files.append(str(temp_file.resolve()))
                
            # 2. Setup the prompt and inject the JSON schema definition
            schema_json = json.dumps(UnitExtraction.model_json_schema(), indent=2)
            prompt = EXTRACTION_SYSTEM_PROMPT
            prompt += f"\n\nResponse must be a single JSON object conforming strictly to this JSON schema:\n{schema_json}\n\nDo not include any markdown backticks, markdown JSON wrapping, or extra text, just output the raw JSON."
            if notes:
                prompt += f"\n\nUSER NOTES:\n{notes}"
                
            # 3. Format prompt using absolute paths for CLI's file attachment '@' syntax
            attachments = " ".join(f"@{path}" for path in temp_files)
            formatted_prompt = f"{prompt} {attachments}"
            
            # 4. Structure the subprocess execution using the specified gemini CLI models/flags
            cmd = [
                "gemini",
                "-m", self.default_model,
                "-p", formatted_prompt
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # Fallback if the selected model is not found/supported in the current CLI catalog
            if result.returncode != 0 and ("ModelNotFoundError" in result.stderr or "ModelNotFoundError" in result.stdout):
                if self.default_model == "gemini-3.5-flash":
                    self.default_model = "gemini-2.5-flash"
                    cmd[2] = "gemini-2.5-flash"
                    result = subprocess.run(cmd, capture_output=True, text=True)
                
            if result.returncode != 0:
                raise RuntimeError(f"Gemini CLI Execution Error: {result.stderr or result.stdout}")
                
            response_text = result.stdout.strip()
            
            # 5. Clean up markdown block wrapping if returned by the model
            clean_text = response_text
            if clean_text.startswith("```"):
                lines = clean_text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean_text = "\n".join(lines).strip()
                
            # Extract the substring between the first and last curly braces to ignore trailing/leading text
            first_brace = clean_text.find("{")
            last_brace = clean_text.rfind("}")
            if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
                clean_text = clean_text[first_brace:last_brace + 1]
                
            try:
                # Validate output JSON against Pydantic schema
                return UnitExtraction.model_validate_json(clean_text)
            except Exception as e:
                # Handle error explicitly, do not swallow, raise with debugging context
                raise ValueError(
                    f"JSON validation failed for response:\n---RAW RESPONSE---\n{response_text}\n---END RAW---\n"
                    f"Cleaned JSON substring tried:\n---CLEANED SUBSTRING---\n{clean_text}\n---END CLEANED---\n"
                    f"Error details: {e}"
                ) from e
            
        finally:
            # 6. Clean up temporary files immediately
            for path_str in temp_files:
                try:
                    p = Path(path_str)
                    if p.exists():
                        p.unlink()
                except Exception as e:
                    print(f"Error deleting temp file {path_str}: {e}")
