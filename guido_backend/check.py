from dotenv import load_dotenv
from elevenlabs.client import ElevenLabs
import os
import google.generativeai as genai
import tempfile

load_dotenv()
GENAI_API_KEY = os.getenv("GENAI_API_KEY")

genai.configure(api_key=GENAI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")




def describe_places(lat, lng, place_name, language):
    location_context = f"near coordinates ({lat}, {lng}), at {place_name} street or square"
    
    prompt = f"""
    You are an information assistant. A person is standing {location_context}.
    
    Give a short, factual description of what is IMMEDIATELY around this exact location 
    within 20-30 meters ONLY. 

    - Give names of specific buildings, entrances, pathways, statues, plaques.
    - Point out any historical markers or notable architectural features.
    - Do NOT describe weather, trees, skies, or generic scenery.  
    - Do NOT mention large landmarks or areas unless the person is standing directly at them.
    - Only describe what is in the IMMEDIATE vicinity: specific buildings, entrances, 
    pathways, statues, plaques, or architectural features RIGHT where they're standing.
    - If possible, describe them in terms of direction from the person: 
    "Directly in front of you is...", "To your immediate left is...", etc.  
    - Be HYPERSPECIFIC about the exact spot, not the general area.
    - Keep the language factual, and precise (5 sentences max).  
    - Include historical notes if relevant.  
    - Avoid storytelling, no "imagine this," no "alright everyone," no fluff.  
    - DO NOT describe generic shops, hotels, gyms, or residential apartments unless
    they are historically/culturally important to THIS EXACT SPOT.
    - Talk about buildings that have names for example Harvard Law School, the White House etc.
    - Talk in order first talk about buildings exactly beside and near the person and then start further away, be more precise.
    - Respond to this prompt in the {language} language.
    """

    response = model.generate_content(prompt)
    return response.text

def speech(msg):
    api_key = os.getenv("ELEVEN_API_KEY")
    if not api_key:
        raise ValueError("Missing ELEVEN_API_KEY!")

    client = ElevenLabs(api_key=api_key)

    print("Tour Guide:", msg)

    audio_stream = client.text_to_speech.convert(
        text=msg,
        voice_id="JBFqnCBsd6RMkjVDRZzb",
        model_id="eleven_flash_v2_5",
        output_format="mp3_44100_128",
    )

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
        for chunk in audio_stream:
            f.write(chunk)
        return f.name

def generate_audio_for_location(lat, lng, place_name, language="English"):
    description = describe_places(lat, lng, place_name, language)
    audio_file_path = speech(description)
    
    return audio_file_path, description

# How do I plug in the language to the describe_places function?
# Still need to define the get_language function and uncomment
# the language variable in the describe_places function