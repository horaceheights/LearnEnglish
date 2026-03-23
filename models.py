import streamlit as st
from google import genai

# This uses your secret key from the .streamlit folder
try:
    api_key = st.secrets["GEMINI_API_KEY"]
    client = genai.Client(api_key=api_key)

    print("--- Searching for Image Models ---")
    
    # In the new SDK, we just list the models 
    # and look at the 'capabilities'
    for model in client.models.list():
        # We look for 'generate_images' in the capabilities list
        # This is the updated way to check in 2026
        if 'generate_images' in str(model):
            print(f"✅ FOUND MODEL: {model.name}")
            
except Exception as e:
    print(f"❌ Error: {e}")