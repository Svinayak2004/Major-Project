"""
Realtime recorder (unchanged structure) with robust TXT output and wolora handoff.
Only minimal fixes:
- guarantee .txt is created (fallback to full-audio transcription)
- use absolute path when invoking wolora.py
- preserve temp WAV if ffmpeg missing
"""
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="ignore")
sys.stderr.reconfigure(encoding="utf-8", errors="ignore")

import os
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"
import re
import sys
import queue
import joblib
import soundfile as sf
from pathlib import Path
import numpy as np
import pandas as pd
import subprocess
import torch
from datetime import datetime

# optional imports
try:
    import sounddevice as sd
except ImportError:
    raise RuntimeError("Please install sounddevice: pip install sounddevice")

try:
    import whisper
except ImportError:
    raise RuntimeError("Please install whisper: pip install -U openai-whisper")

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
except ImportError:
    raise RuntimeError("Please install scikit-learn: pip install scikit-learn")

try:
    import spacy
except ImportError:
    raise RuntimeError("Please install spaCy: pip install spacy")


# ---------------------------
# Configuration
# ---------------------------
SAMPLE_RATE = 16000
CHUNK_SIZE = 1024
AUDIO_SECONDS_PER_CHUNK = 8.0
MODEL_SIZE = "small"  # Whisper model size
MODEL_DIR = Path("models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)
RECORDINGS_DIR = Path("recordings")
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

DIARIZE_CSV = "diarize.csv"
PRETRAIN_CSV = "PreTraining.csv"

ROLE_CLF_PATH = MODEL_DIR / "role_clf.pkl"
ROLE_VEC_PATH = MODEL_DIR / "role_vectorizer.pkl"
ENTITY_DICT_PATH = MODEL_DIR / "entity_dict.pkl"

VAD_THRESHOLD = 0.0008
SILENCE_LIMIT = 25.0  # 25 seconds silence to stop
DEBUG_ENERGY = False


# ---------------------------
# Helpers
# ---------------------------
def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def vad_is_speech(audio_chunk: np.ndarray) -> bool:
    energy = np.mean(audio_chunk ** 2)
    if DEBUG_ENERGY:
        print(f"Energy: {energy:.6f}")
    return energy > VAD_THRESHOLD


def next_conversation_number(recordings_dir: Path) -> int:
    existing = [f.stem for f in recordings_dir.glob("convo_*.*")]
    nums = []
    for e in existing:
        parts = e.split("_")
        if len(parts) > 1 and parts[1].isdigit():
            nums.append(int(parts[1]))
    return max(nums, default=0) + 1


def dedupe_transcript(new_text: str, prev_text: str, threshold: float = 0.6) -> str:
    if not prev_text:
        return new_text
    overlap_len = int(len(prev_text) * threshold)
    if overlap_len <= 0:
        return new_text
    overlap_portion = prev_text[-overlap_len:]
    if new_text.startswith(overlap_portion):
        return new_text[len(overlap_portion):].strip()
    return new_text


def save_audio_as_mp3(audio_arr: np.ndarray, mp3_path: Path) -> Path:
    """
    Save float32 mono audio at SAMPLE_RATE as MP3 using ffmpeg.
    If ffmpeg missing or conversion fails, keep temp WAV and return that path.
    Returns path to audio file that should be used for transcription (mp3 preferred, otherwise wav).
    """
    tmp_wav_path = mp3_path.with_suffix(".tmp_raw.wav")

    # Write temporary wav
    sf.write(str(tmp_wav_path), audio_arr, SAMPLE_RATE)

    # Try to convert to MP3
    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "error",
        "-i", str(tmp_wav_path),
        "-acodec", "libmp3lame",
        "-qscale:a", "3",
        str(mp3_path),
    ]
    try:
        subprocess.run(cmd, check=True)
        # conversion succeeded, remove tmp wav and return mp3
        try:
            os.remove(tmp_wav_path)
        except OSError:
            pass
        return mp3_path
    except FileNotFoundError:
        print("ffmpeg not found. Please install it and ensure it's on PATH.")
        print(f"Using temporary WAV at: {tmp_wav_path}")
        return tmp_wav_path
    except subprocess.CalledProcessError as e:
        print("ffmpeg failed to convert WAV to MP3:", e)
        print(f"Keeping temporary WAV at: {tmp_wav_path}")
        return tmp_wav_path


# ---------------------------
# Role Classifier
# ---------------------------
def prepare_role_classifier(csv_path=DIARIZE_CSV):
    if ROLE_CLF_PATH.exists() and ROLE_VEC_PATH.exists():
        print("Loading saved role classifier...")
        clf = joblib.load(ROLE_CLF_PATH)
        vec = joblib.load(ROLE_VEC_PATH)
        return clf, vec

    print("Training new role classifier...")
    df = pd.read_csv(csv_path)
    utterances, labels = [], []

    for _, row in df.iterrows():
        if pd.notna(row.get("doctor")):
            utterances.append(clean_text(row["doctor"]))
            labels.append("doctor")
        if pd.notna(row.get("patient")):
            utterances.append(clean_text(row["patient"]))
            labels.append("patient")

    if len(utterances) < 10:
        raise ValueError("Not enough examples in diarize.csv")

    vec = TfidfVectorizer(max_features=5000, ngram_range=(1, 2))
    X = vec.fit_transform(utterances)
    clf = LogisticRegression(max_iter=1000).fit(X, labels)

    joblib.dump(clf, ROLE_CLF_PATH)
    joblib.dump(vec, ROLE_VEC_PATH)
    print("Saved classifier to models/ folder.")
    return clf, vec


# ---------------------------
# Entity Dictionary
# ---------------------------
def build_entity_resources(csv_path=PRETRAIN_CSV):
    if ENTITY_DICT_PATH.exists():
        print("Loaded entity dictionary.")
        return joblib.load(ENTITY_DICT_PATH), None

    print("Building entity dictionary...")
    df = pd.read_csv(csv_path)
    cols = ["symptom", "treatment", "bodypart", "diagnosis", "others"]
    entity_dict = {c: set() for c in cols}
    for c in cols:
        if c in df.columns:
            for val in df[c].dropna().astype(str):
                for p in re.split(r"[;/,()|]", val):
                    if p.strip():
                        entity_dict[c].add(p.strip().lower())
    joblib.dump(entity_dict, ENTITY_DICT_PATH)
    print("Entity dictionary saved.")

    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        print("Downloading en_core_web_sm...")
        from spacy.cli import download
        download("en_core_web_sm")
        nlp = spacy.load("en_core_web_sm")

    return entity_dict, nlp


# ---------------------------
# Load Models
# ---------------------------
print("Initializing pipeline...")
role_clf, role_vec = prepare_role_classifier()
entity_dict, nlp = build_entity_resources()

print("Loading Whisper ASR model (openai-whisper)...")
WHISPER_CACHE_DIR = MODEL_DIR / "whisper_cache"
WHISPER_CACHE_DIR.mkdir(parents=True, exist_ok=True)

if torch.cuda.is_available():
    WHISPER_DEVICE = "cuda"
    WHISPER_FP16 = True
    print("Using GPU (CUDA)")
else:
    WHISPER_DEVICE = "cpu"
    WHISPER_FP16 = False
    print("Using CPU mode")

stt_model = whisper.load_model(
    MODEL_SIZE,
    device=WHISPER_DEVICE,
    download_root=str(WHISPER_CACHE_DIR),
)


# ---------------------------
# Audio Queue
# ---------------------------
audio_q = queue.Queue()


def audio_callback(indata, frames, time_info, status):
    if status:
        print(status)
    audio_q.put(indata.copy())


# ---------------------------
# Real-Time Recording
# ---------------------------
def run_realtime():
    convo_number = next_conversation_number(RECORDINGS_DIR)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mp3_path = RECORDINGS_DIR / f"convo_{convo_number}_{timestamp}.mp3"
    txt_path = RECORDINGS_DIR / f"convo_{convo_number}_{timestamp}.txt"

    print("\nStarting real-time English doctor/patient transcription...")
    print(f"Current session: convo_{convo_number}")
    print("Speak naturally — stops after 10s of silence or Ctrl+C.\n")

    samples_needed = int(SAMPLE_RATE * AUDIO_SECONDS_PER_CHUNK)
    buffer = []
    recorded_audio = []
    transcript_lines = []

    silence_time = 0.0
    active = False
    prev_text = ""

    try:
        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            blocksize=CHUNK_SIZE,
            channels=1,
            dtype="float32",
            callback=audio_callback,
        ):
            print("Listening...\n")

            while True:
                try:
                    chunk = audio_q.get(timeout=1.0)
                except queue.Empty:
                    continue

                if chunk.ndim > 1:
                    chunk = chunk[:, 0]

                recorded_audio.append(chunk.copy())

                if vad_is_speech(chunk):
                    silence_time = 0.0
                    active = True
                else:
                    if active:
                        silence_time += CHUNK_SIZE / SAMPLE_RATE
                        if silence_time >= SILENCE_LIMIT:
                            print("Silence detected — saving session.")
                            break

                buffer.extend(chunk.tolist())
                if len(buffer) >= samples_needed:
                    audio_array = np.array(buffer, dtype=np.float32)
                    buffer = []

                    # Transcribe chunk (English-only)
                    try:
                        result = stt_model.transcribe(
                            audio_array,
                            language="en",
                            task="transcribe",
                            fp16=WHISPER_FP16,
                        )
                    except Exception as e:
                        print("chunk transcription failed:", e)
                        result = {"text": ""}

                    text = (result.get("text") or "").strip()
                    if not text:
                        continue

                    text = dedupe_transcript(text, prev_text)
                    prev_text += " " + text

                    cleaned = clean_text(text)
                    try:
                        role_vecs = role_vec.transform([cleaned])
                        role = role_clf.predict(role_vecs)[0]
                    except Exception:
                        role = "unknown"

                    line = f"[{role.capitalize()}] {text}"
                    try:
                        print(line, flush=True)
                    except UnicodeEncodeError:
                        print(line.encode("utf-8", errors="ignore").decode(), flush=True)

                    transcript_lines.append(line)

    except KeyboardInterrupt:
        print("\nStopped manually.")

    audio_file_for_transcription = None

    if recorded_audio:
        audio_arr = np.concatenate(recorded_audio, axis=0).astype(np.float32)
        # Save mp3 (or wav fallback)
        saved_audio_path = save_audio_as_mp3(audio_arr, mp3_path)
        if saved_audio_path.exists():
            print(f"Saved audio: {saved_audio_path}")
            audio_file_for_transcription = saved_audio_path
        else:
            # Shouldn't happen, but fallback to writing a WAV
            fallback_wav = mp3_path.with_suffix(".fallback.wav")
            sf.write(str(fallback_wav), audio_arr, SAMPLE_RATE)
            audio_file_for_transcription = fallback_wav
            print(f"Audio saved to fallback WAV: {fallback_wav}")

    # If transcript_lines is empty, fallback to transcribing the full saved audio
    final_transcript = ""
    if transcript_lines:
        final_transcript = "\n".join(transcript_lines)
    else:
        if audio_file_for_transcription is not None:
            print("No incremental transcript found — transcribing full audio as fallback...")
            try:
                full_path = str(audio_file_for_transcription.resolve())
                print("DEBUG: transcribing full file:", full_path)
                full_result = stt_model.transcribe(full_path, language="en", task="transcribe", fp16=WHISPER_FP16)
                full_text = (full_result.get("text") or "").strip()
                if full_text:
                    final_transcript = full_text
                    print("Full-audio transcription obtained (chars):", len(final_transcript))
                else:
                    print("Full-audio transcription returned empty text.")
            except Exception as e:
                print("Full-audio transcription failed:", e)

    if final_transcript:
        # Save transcript to txt_path
        try:
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(final_transcript)
            print(f"Saved transcript: {txt_path}")
        except Exception as e:
            print("Failed to write transcript:", e)
    else:
        print("No transcript available to save.")

    # Invoke wolora.py only if txt exists and wolora.py present
    if os.path.exists("wolora.py") and txt_path.exists():
        abs_txt = str(Path(txt_path).resolve())
        print("Running wolora.py for post-processing...\n")
        try:
            subprocess.run([sys.executable, "wolora.py", "--input", abs_txt], check=False)
        except Exception as e:
            print("Failed to launch wolora.py:", e)
    else:
        if not os.path.exists("wolora.py"):
            print("wolora.py not found. Skipping FHIR step.")
        else:
            print("Transcript file not found. Skipping wolora invocation.")


# ---------------------------
# Entry Point
# ---------------------------
if __name__ == "__main__":
    run_realtime()
