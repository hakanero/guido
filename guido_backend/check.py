"""
check.py
base version written during the HackHarvard Hackathon 2025
by Rudransh Agrawal, Coleman Hayes

Current version by Hakan Eroglu

Generates audio tours of locations.
"""

from dotenv import load_dotenv
import os
import requests
from google import genai
import tempfile
from gtts import gTTS

load_dotenv()
GENAI_API_KEY = os.getenv("GENAI_API_KEY")

client = genai.Client(api_key=GENAI_API_KEY)


def get_nearby_places(lat, lng, radius=50):
    url = "https://overpass-api.de/api/interpreter"
    query = f"""
    [out:json];
    (
      node["historic"](around:{radius},{lat},{lng});
      node["tourism"](around:{radius},{lat},{lng});
      node["amenity"](around:{radius},{lat},{lng});
      way["historic"](around:{radius},{lat},{lng});
      way["tourism"](around:{radius},{lat},{lng});
      way["amenity"](around:{radius},{lat},{lng});
    );
    out tags;
    """
    try:
        response = requests.get(url, params={"data": query}, timeout=10)
        response.raise_for_status()
        data = response.json()

        places = []
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            name = tags.get("name")
            if name:
                kinds = [k for k in ["historic", "tourism", "amenity"] if k in tags]
                # Avoid duplicates
                if not any(p["name"] == name for p in places):
                    places.append({"name": name, "types": kinds})
        return places[:5]
    except Exception as e:
        print(f"Error fetching from OSM: {e}")
        return []


def describe_places(lat, lng, place_name, language):
    places = get_nearby_places(lat, lng)

    location_context = (
        f"near coordinates ({lat}, {lng}), at {place_name} street or square"
    )

    if not places:
        prompt = f"""
        You are an information assistant. There are no significant pins or landmarks 
        returned for a person standing {location_context}. 

        Give a short, factual description of what is IMMEDIATELY around this exact location 
        within 20-30 meters ONLY. 

        -Give names of specific buildings, entrances, pathways, statues, plaques,
        - point out any historical markers or notable architectural features.
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
        - Respond to this prompt in the {language} language
        """
    else:
        place_info = [
            f"{p.get('name')} ({', '.join(p.get('types', []))})" for p in places
        ]
        prompt = f"""
        You are an information assistant. A person is standing at {location_context}.  
        Here are the closest nearby places (all within 50 meters):

        {chr(10).join(place_info)}

        Your task:
        -Give names of specific buildings, entrances, pathways, statues, plaques,
        - point out any historical markers or notable architectural features.
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
        talk about buildings that have names for example Harvard Law School, the White House etc.
        - Talk in order first talk about buildings exactly beside and near the person and then start further away, be more precise
        you can do it 
        - also dont keep talking about the same area even if we moved away update frequently
        - Respond to this prompt in the {language} language
        """

    response = client.models.generate_content(model="gemma-3-27b-it", contents=prompt)
    return response.text


def speech(msg):
    print("Tour Guide generating TTS...")
    
    # We use tld="com.au" to give it a slightly fun Australian accent. 
    # Unfortunately gTTS does not natively support pitching down or speeding up.
    tts = gTTS(text=msg, lang="en", tld="com.au")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as f:
        output_file = f.name

    tts.save(output_file)

    return output_file


def generate_audio_for_location(lat, lng, place_name, language="English"):
    description = describe_places(lat, lng, place_name, language)
    audio_file_path = speech(description)

    return audio_file_path, description


# How do I plug in the language to the describe_places function?
# Still need to define the get_language function and uncomment
# the language variable in the describe_places function
