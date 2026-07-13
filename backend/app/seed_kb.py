import asyncio
import sys
from pathlib import Path

# Add backend to path to allow importing app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.services.embedding import embed_texts
from app.services.vector_store import upsert_chunks
from app.middleware.auth import get_supabase
from app.config import get_settings

async def seed():
    # User ID to associate the document with
    user_id = "b1522832-2926-4188-a67e-55a084996c60" # Mahesh's user ID
    supabase = get_supabase()
    
    # 1. Create document in Supabase
    doc_data = {
        "title": "PlantMD Tomato & Pepper Disease Reference Guide",
        "storage_path": "uploads/tomato_pepper_guide.pdf",
        "file_size": 12500,
        "page_count": 3,
        "uploaded_by": user_id,
        "status": "ready"
    }
    
    doc_res = supabase.table("documents").insert(doc_data).execute()
    if not doc_res.data:
        print("Failed to insert document metadata")
        return
        
    doc_id = doc_res.data[0]["id"]
    print(f"Created document metadata with ID: {doc_id}")
    
    # 2. Define our high-quality agricultural chunks
    chunks = [
        {
            "content": (
                "Tomato Early Blight (Fungal Disease):\n"
                "Early Blight is a common fungal disease caused by the pathogen Alternaria solani. "
                "It primarily affects tomato plants and can cause significant crop damage if left untreated.\n\n"
                "Symptoms:\n"
                "- The disease starts on older, lower leaves as small, circular brown spots.\n"
                "- These spots enlarge up to 1/2 inch and develop concentric rings, forming a 'target spot' pattern.\n"
                "- The surrounding leaf tissue turns yellow. Eventually, infected leaves turn entirely yellow, wither, and drop off.\n"
                "- Dark, sunken lesions may also appear on the tomato stems and fruit near the stem end.\n\n"
                "Causes:\n"
                "- The fungus overwinter in soil and crop debris.\n"
                "- Spores are spread by wind, water splashes, insects, and gardening tools during warm, wet weather."
            ),
            "chunk_index": 0,
            "page_number": 1,
            "document_title": "PlantMD Tomato & Pepper Disease Reference Guide",
            "category": "tomato"
        },
        {
            "content": (
                "Tomato Early Blight Management and Treatment:\n\n"
                "Organic and Cultural Treatments:\n"
                "- Prune and remove infected lower leaves immediately to stop the upward spread of spores.\n"
                "- Mulch around the base of tomato plants to prevent soil-borne spores from splashing onto lower leaves.\n"
                "- Water plants at the soil level using drip irrigation or a soaker hose. Avoid overhead watering to keep foliage dry.\n"
                "- Apply copper-based organic fungicides (liquid copper) at the first sign of symptoms or before damp weather.\n\n"
                "Chemical Treatments:\n"
                "- Use preventative chemical fungicides containing chlorothalonil, mancozeb, or azoxystrobin. "
                "Always consult local agricultural extension services for specific application guidance and regional regulations.\n\n"
                "Prevention:\n"
                "- Practice crop rotation, waiting at least 3 years before planting Solanaceous crops (tomatoes, peppers, potatoes, eggplants) in the same spot.\n"
                "- Space tomato plants at least 24-36 inches apart to ensure good air circulation."
            ),
            "chunk_index": 1,
            "page_number": 1,
            "document_title": "PlantMD Tomato & Pepper Disease Reference Guide",
            "category": "tomato"
        },
        {
            "content": (
                "Nitrogen Deficiency in Tomato Plants:\n"
                "Nitrogen is a critical macronutrient required for vegetative growth and chlorophyll production. "
                "A deficiency in nitrogen results in characteristic signs of leaf yellowing (chlorosis).\n\n"
                "Symptoms:\n"
                "- General yellowing starts on the oldest, lower leaves first, while the upper new leaves remain pale green.\n"
                "- Leaf veins may develop a reddish-purple hue.\n"
                "- Overall plant growth is severely stunted, stems become thin and woody, and flower production drops.\n\n"
                "Causes:\n"
                "- Sandy soils prone to leaching, compacted soil, low organic matter, or incorrect soil pH preventing nutrient uptake.\n\n"
                "Organic Treatments:\n"
                "- Side-dress plants with organic nitrogen sources like blood meal, fish emulsion, well-composted manure, or alfalfa meal.\n"
                "- Water plants with diluted liquid seaweed/fish fertilizer every 2 weeks.\n\n"
                "Chemical Treatments:\n"
                "- Apply a balanced, water-soluble fertilizer (such as 10-10-10 or 20-20-20 NPK) or nitrogen-specific fertilizers like ammonium sulfate."
            ),
            "chunk_index": 2,
            "page_number": 2,
            "document_title": "PlantMD Tomato & Pepper Disease Reference Guide",
            "category": "tomato"
        },
        {
            "content": (
                "Septoria Leaf Spot in Tomatoes:\n"
                "Septoria leaf spot is a highly destructive fungal disease caused by Septoria lycopersici. "
                "While it does not directly infect the fruit, the resulting defoliation exposes fruit to sunscald and reduces yield.\n\n"
                "Symptoms:\n"
                "- Small, circular spots (1/16 to 1/8 inch) with dark brown margins and lighter grey or tan centers.\n"
                "- Small black specks (pycnidia, the fruiting bodies of the fungus) appear in the centers of the spots.\n"
                "- Spots multiply rapidly, causing leaves to turn yellow, dry up, and fall off, progressing from bottom to top.\n\n"
                "Treatment and Control:\n"
                "- Remove and safely destroy heavily infected leaves. Do not compost.\n"
                "- Apply organic copper-based sprays or chemical fungicides (chlorothalonil) every 7-14 days during wet periods.\n"
                "- Clean and sanitize all tomato cages, stakes, and pruning shears with a 10% bleach solution after use."
            ),
            "chunk_index": 3,
            "page_number": 3,
            "document_title": "PlantMD Tomato & Pepper Disease Reference Guide",
            "category": "tomato"
        }
    ]
    
    # 3. Generate embeddings
    texts = [c["content"] for c in chunks]
    print("Generating embeddings...")
    embeddings = embed_texts(texts)
    
    # 4. Upsert to Qdrant
    print("Upserting chunks to Qdrant...")
    upserted = upsert_chunks(doc_id, chunks, embeddings)
    print(f"Success! Seeding complete. Upserted {upserted} chunks into Qdrant collection 'plant_disease_docs'.")

if __name__ == "__main__":
    asyncio.run(seed())
