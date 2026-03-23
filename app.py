import streamlit as st
from google import genai
from google.genai import types
from PIL import Image
from io import BytesIO

# Setup the AI Client
MY_API_KEY = st.secrets["GEMINI_API_KEY"]
client = genai.Client(api_key=MY_API_KEY)

st.title("💡 Inductive English Lab")
st.subheader("Level 1: Concept Mastery")

vocab = ["A boy", "A girl", "is running", "is eating"]

if st.button("Generate Next Lesson Step"):
    with st.spinner("1. Designing the scene..."):
        # This part generates the description (The "Brain")
        text_response = client.models.generate_content(
            model="gemini-3.1-flash-image-preview", 
            contents=f"Describe a simple scene for an English learner. Subject: {vocab[0]}. Action: {vocab[2]}. Mention clothing colors and background. No translation."
        )
        scene_description = text_response.text
        st.info(scene_description)

    with st.spinner("2. Nano Banana 2 is creating the image..."):
        try:
            # We use 'generate_content' because this is a native multimodal model
            image_response = client.models.generate_content(
                model="gemini-3.1-flash-image-preview",
                contents=[scene_description],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"] # This forces it to output pixels
                )
            )
            
            # This part extracts the image from the AI response
            for part in image_response.candidates[0].content.parts:
                if part.inline_data:
                    image_bytes = BytesIO(part.inline_data.data)
                    img = Image.open(image_bytes)
                    st.image(img, caption="Level 1: Concept Mastery")
        
        except Exception as e:
            st.error(f"Image Error: {e}")
        


    st.success("Lesson Ready! Can you describe what you see?")