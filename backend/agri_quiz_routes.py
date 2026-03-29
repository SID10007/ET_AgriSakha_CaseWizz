"""
Rural India farmer quiz API — questions from Gemini JSON mode.
Registered from main_backend.py (not news.py).
"""
import json
import logging
import os
import re
import tempfile
import google.generativeai as genai
from flask import request, jsonify

logger = logging.getLogger(__name__)

ALLOWED_ICONS = ("leaf", "clock", "droplet", "seed", "tractor", "sun", "wheat", "cloud")


def _quiz_model():
    return genai.GenerativeModel(
        "gemini-3-flash-preview",
        generation_config={
            "response_mime_type": "application/json",
            "temperature": 0.45,
        },
    )


def _fallback_questions():
    """Static easy questions if Gemini fails."""
    return {
        "questions": [
            {
                "question": "What is the primary benefit of crop rotation for sustainable farming?",
                "options": [
                    {
                        "title": "Maintaining Soil Health",
                        "description": "Prevents nutrient depletion and breaks pest cycles naturally.",
                        "icon": "leaf",
                    },
                    {
                        "title": "Faster Harvesting Time",
                        "description": "Focuses solely on increasing the speed of crop maturation.",
                        "icon": "clock",
                    },
                    {
                        "title": "Reduced Water Usage",
                        "description": "Optimizes moisture retention through specialized topsoil layering.",
                        "icon": "droplet",
                    },
                ],
                "correctIndex": 0,
            },
            {
                "question": "Which practice helps retain moisture in dry rural fields?",
                "options": [
                    {
                        "title": "Mulching",
                        "description": "Covering soil with organic or plastic material to reduce evaporation.",
                        "icon": "leaf",
                    },
                    {
                        "title": "Deep ploughing daily",
                        "description": "Turning soil every day regardless of weather.",
                        "icon": "tractor",
                    },
                    {
                        "title": "Removing all weeds without replacement",
                        "description": "Bare soil exposed to strong sun.",
                        "icon": "sun",
                    },
                ],
                "correctIndex": 0,
            },
            {
                "question": "PM-KISAN mainly supports farmers with:",
                "options": [
                    {
                        "title": "Income support instalments",
                        "description": "Direct benefit transfers to eligible landholding farmer families.",
                        "icon": "seed",
                    },
                    {
                        "title": "Free tractors for every village",
                        "description": "One tractor per panchayat regardless of eligibility.",
                        "icon": "tractor",
                    },
                    {
                        "title": "Crop insurance premium only",
                        "description": "Only insurance, no income support.",
                        "icon": "cloud",
                    },
                ],
                "correctIndex": 0,
            },
            {
                "question": "Legumes in a rotation help soil mainly by:",
                "options": [
                    {
                        "title": "Fixing nitrogen",
                        "description": "Partnering with bacteria to add nitrogen to the soil.",
                        "icon": "leaf",
                    },
                    {
                        "title": "Increasing soil salinity",
                        "description": "Making soil saltier for better taste.",
                        "icon": "droplet",
                    },
                    {
                        "title": "Removing all organic matter",
                        "description": "Stripping humus from topsoil.",
                        "icon": "sun",
                    },
                ],
                "correctIndex": 0,
            },
            {
                "question": "Drip irrigation is especially useful when:",
                "options": [
                    {
                        "title": "Water is scarce",
                        "description": "Delivering water slowly near the root zone saves water.",
                        "icon": "droplet",
                    },
                    {
                        "title": "Flooding the field is required",
                        "description": "Standing water must cover the whole plot.",
                        "icon": "cloud",
                    },
                    {
                        "title": "Only rice is grown",
                        "description": "Drip is never used outside rice paddies.",
                        "icon": "seed",
                    },
                ],
                "correctIndex": 0,
            },
        ]
    }


def _normalize_quiz_payload(data: dict) -> dict:
    """Validate and fix icon keys; ensure 5 questions with 3 options each."""
    questions = data.get("questions") or []
    out_q = []
    for q in questions[:5]:
        opts = q.get("options") or []
        if len(opts) != 3:
            continue
        norm_opts = []
        for o in opts:
            ic = str(o.get("icon") or "leaf").lower()
            if ic not in ALLOWED_ICONS:
                ic = "leaf"
            norm_opts.append(
                {
                    "title": str(o.get("title", ""))[:200],
                    "description": str(o.get("description", ""))[:300],
                    "icon": ic,
                }
            )
        if len(norm_opts) != 3:
            continue
        ci = q.get("correctIndex", 0)
        try:
            ci = int(ci)
        except (TypeError, ValueError):
            ci = 0
        ci = max(0, min(2, ci))
        out_q.append(
            {
                "question": str(q.get("question", ""))[:500],
                "options": norm_opts,
                "correctIndex": ci,
            }
        )
    if len(out_q) < 5:
        fb = _fallback_questions()["questions"]
        out_q.extend(fb[len(out_q) : 5])
    return {"questions": out_q[:5]}


def generate_quiz_questions():
    prompt = """You are an expert in agricultural extension for smallholder farmers in rural India.
Create exactly 5 multiple-choice questions. Difficulty: EASY (class 8–10 level). 
Topics should relate to: soil health, water saving, crop rotation, basic government schemes for farmers (e.g. PM-KISAN, soil health), animal care basics, or safe use of fertilisers — always appropriate for rural Indian contexts.

Each question must have exactly 3 options. Each option needs:
- title: short (max 8 words)
- description: one clarifying sentence (max 25 words)
- icon: one of: leaf, clock, droplet, seed, tractor, sun, wheat, cloud

Exactly one option must be correct per question. Set "correctIndex" to 0, 1, or 2.

Return ONLY valid JSON (no markdown) with this shape:
{
  "questions": [
    {
      "question": "string",
      "options": [
        {"title": "string", "description": "string", "icon": "leaf"},
        {"title": "string", "description": "string", "icon": "clock"},
        {"title": "string", "description": "string", "icon": "droplet"}
      ],
      "correctIndex": 0
    }
  ]
}
"""
    model = _quiz_model()
    resp = model.generate_content(prompt)
    raw = (resp.text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    data = json.loads(raw)
    return _normalize_quiz_payload(data)


def evaluate_freeform_answer(question: str, options: list, correct_index: int, user_answer: str) -> dict:
    """Use Gemini to judge if spoken/written free-form answer matches the correct concept."""
    if correct_index < 0 or correct_index >= len(options):
        correct_index = 0
    correct_opt = options[correct_index] if options else {}
    correct_title = correct_opt.get("title", "")
    correct_desc = correct_opt.get("description", "")

    prompt = f"""You are a fair grader for Indian farmer learners. The user may answer in English or Hinglish or short Hindi mixed with English.

Question: {question}

Option A: {(options[0] or {}).get('title', '')} — {(options[0] or {}).get('description', '')}
Option B: {(options[1] or {}).get('title', '')} — {(options[1] or {}).get('description', '')}
Option C: {(options[2] or {}).get('title', '')} — {(options[2] or {}).get('description', '')}

The correct answer is option index {correct_index} (0=A, 1=B, 2=C): {correct_title}. {correct_desc}

User's spoken or typed answer (transcribed): "{user_answer}"

Decide if the user's meaning matches the CORRECT option (semantic match — not exact wording). 
Return ONLY valid JSON:
{{
  "isCorrect": true or false,
  "feedback": "one encouraging sentence (max 30 words)",
  "matchedOptionIndex": null or 0 or 1 or 2 if you can tell which option they meant
}}
"""
    model = genai.GenerativeModel(
        "gemini-3-flash-preview",
        generation_config={"response_mime_type": "application/json", "temperature": 0.2},
    )
    resp = model.generate_content(prompt)
    raw = (resp.text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    out = json.loads(raw)
    return {
        "isCorrect": bool(out.get("isCorrect", False)),
        "feedback": str(out.get("feedback", ""))[:400],
        "matchedOptionIndex": out.get("matchedOptionIndex"),
        "correctOptionTitle": correct_title,
        "correctIndex": correct_index,
    }


def register_agri_quiz_routes(app, transcribe_audio_step=None):
    """
    transcribe_audio_step: optional callable(file_storage) -> str from main_backend.
    """

    @app.route("/api/agri-quiz/generate", methods=["POST"])
    def agri_quiz_generate():
        try:
            data = generate_quiz_questions()
            return jsonify({"status": "success", **data})
        except Exception as e:
            logger.exception("agri_quiz_generate: %s", e)
            try:
                return jsonify({"status": "success", **_fallback_questions()})
            except Exception:
                return jsonify({"status": "error", "message": str(e)}), 500

    @app.route("/api/agri-quiz/evaluate", methods=["POST"])
    def agri_quiz_evaluate():
        try:
            body = request.get_json(force=True, silent=True) or {}
            question = body.get("question", "")
            options = body.get("options") or []
            correct_index = int(body.get("correctIndex", 0))
            user_answer = (body.get("userAnswer") or "").strip()
            if not user_answer:
                return jsonify({"error": "userAnswer is required"}), 400
            result = evaluate_freeform_answer(question, options, correct_index, user_answer)
            return jsonify({"status": "success", **result})
        except Exception as e:
            logger.exception("agri_quiz_evaluate: %s", e)
            return jsonify({"status": "error", "message": str(e)}), 500

    @app.route("/api/agri-quiz/transcribe", methods=["POST"])
    def agri_quiz_transcribe():
        if not transcribe_audio_step:
            return jsonify({"error": "Transcription not configured"}), 503
        try:
            if "audio" not in request.files:
                return jsonify({"error": "No audio file"}), 400
            audio = request.files["audio"]
            suffix = ".webm"
            fn = (audio.filename or "").lower()
            if ".wav" in fn:
                suffix = ".wav"
            elif ".mp3" in fn:
                suffix = ".mp3"
            tmp_path = None
            try:
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp_path = tmp.name
                    audio.save(tmp_path)
                text = transcribe_audio_step(tmp_path)
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    try:
                        os.remove(tmp_path)
                    except OSError:
                        pass
            return jsonify({"status": "success", "text": text})
        except Exception as e:
            logger.exception("agri_quiz_transcribe: %s", e)
            return jsonify({"error": str(e)}), 500
