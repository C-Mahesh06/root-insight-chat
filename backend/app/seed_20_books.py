import asyncio
import sys
from pathlib import Path

# Add backend to path to allow importing app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.services.embedding import embed_texts
from app.services.vector_store import upsert_chunks
from app.middleware.auth import get_supabase

async def seed_master_encyclopedia():
    user_id = "b1522832-2926-4188-a67e-55a084996c60" # Mahesh's user ID
    supabase = get_supabase()
    
    # 1. Create document entry
    doc_data = {
        "title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
        "storage_path": "uploads/botanical_encyclopedia.pdf",
        "file_size": 75000,
        "page_count": 20,
        "uploaded_by": user_id,
        "status": "ready"
    }
    
    doc_res = supabase.table("documents").insert(doc_data).execute()
    if not doc_res.data:
        print("Failed to insert master document metadata")
        return
        
    doc_id = doc_res.data[0]["id"]
    print(f"Created Master Encyclopedia metadata with ID: {doc_id}")
    
    # 2. Define 20 Detailed Botanical/Agricultural Chapters (Books)
    chunks = [
        # Book 1: Tomato Diseases
        {
            "content": (
                "Book 1: Tomato Diseases (Early Blight, Late Blight, Blossom End Rot)\n"
                "Tomatoes are vulnerable to several pathological issues. Early Blight (Alternaria solani) causes target-like concentric rings on lower leaves, leading to yellowing and defoliation. "
                "Late Blight (Phytophthora infestans) is highly destructive, causing dark, water-soaked lesions on leaves and stems, with white fuzzy mold underneath in humid conditions. "
                "Blossom End Rot is a physiological disorder caused by calcium deficiency, leading to flat, black, leathery patches at the blossom end of the fruit.\n"
                "Organic Treatments: Apply liquid copper fungicide for blights. Adjust soil pH and water consistently for Blossom End Rot.\n"
                "Prevention: Practice 3-year crop rotation, space plants for ventilation, and avoid overhead watering."
            ),
            "chunk_index": 0,
            "page_number": 1,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "tomato"
        },
        # Book 2: Pepper Diseases
        {
            "content": (
                "Book 2: Pepper Diseases (Bacterial Leaf Spot, Phytophthora Blight)\n"
                "Pepper plants are affected by Bacterial Leaf Spot (Xanthomonas campestris), characterized by small, water-soaked spots on leaves that turn dark brown with light centers, causing severe leaf drop. "
                "Phytophthora Blight causes crown rot, sudden wilting, and dark lesions on stems.\n"
                "Organic Treatments: Apply copper-based sprays early in the season. Destroy infected plants immediately to prevent soil contamination.\n"
                "Prevention: Use disease-free seeds, avoid working with wet plants, and improve soil drainage using raised beds."
            ),
            "chunk_index": 1,
            "page_number": 2,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "pepper"
        },
        # Book 3: Potato Diseases
        {
            "content": (
                "Book 3: Potato Diseases (Common Scab, Black Scurf)\n"
                "Common Scab (Streptomyces scabies) causes corky, raised or pitted lesions on potato tubers, affecting quality. "
                "Black Scurf (Rhizoctonia solani) causes 'dirt that won't wash off' (sclerotia) on tubers and girdles emerging sprouts.\n"
                "Organic Treatments: Maintain acidic soil pH (5.2-5.5) to inhibit scab. Apply bio-fungicides containing Bacillus subtilis.\n"
                "Prevention: Use certified disease-free seed potatoes, rotate crops with oats or corn, and avoid fresh manure."
            ),
            "chunk_index": 2,
            "page_number": 3,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "potato"
        },
        # Book 4: Rose Care & Diseases
        {
            "content": (
                "Book 4: Rose Care & Diseases (Black Spot, Powdery Mildew, Rust)\n"
                "Roses are prone to fungal diseases. Black Spot (Diplocarpon rosae) presents as circular black spots on leaves, surrounded by yellow margins, leading to defoliation. "
                "Powdery Mildew (Podosphaera pannosa) leaves a white, powdery coating on buds, leaves, and stems. "
                "Rust (Phragmidium) causes bright orange pustules on leaf undersides.\n"
                "Organic Treatments: Apply neem oil, sulfur sprays, or a baking soda solution (1 tbsp baking soda, 1 tsp horticultural oil in 1 gallon of water).\n"
                "Prevention: Prune for open airflow, remove fallen leaves in autumn, and water only at the base."
            ),
            "chunk_index": 3,
            "page_number": 4,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "roses"
        },
        # Book 5: Apple Orchard Care
        {
            "content": (
                "Book 5: Apple Orchard Care (Apple Scab, Fire Blight, Cedar Apple Rust)\n"
                "Apple Scab (Venturia inaequalis) causes olive-green to black velvety spots on leaves and scabby lesions on apples. "
                "Fire Blight (Erwinia amylovora) is a bacterial disease causing branches to turn black and wither as if scorched by fire. "
                "Cedar Apple Rust causes bright orange-yellow spots on leaves.\n"
                "Organic Treatments: Prune infected fire-blight branches 8-12 inches below visible lesions, sterilizing tools between cuts. Use sulfur or copper for scab.\n"
                "Prevention: Plant resistant cultivars (e.g., Liberty, Enterprise) and clear leaf debris."
            ),
            "chunk_index": 4,
            "page_number": 5,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "apple"
        },
        # Book 6: Citrus Tree Care & Diseases
        {
            "content": (
                "Book 6: Citrus Tree Care & Diseases (Citrus Canker, Citrus Greening, Scale Insects)\n"
                "Citrus Canker (Xanthomonas albilineans) causes raised, corky lesions with oily margins on leaves, twigs, and fruit. "
                "Citrus Greening (Huanglongbing) is a deadly bacterial disease spread by psyllids, causing blotchy yellow leaves, stunted bitter fruit, and dieback. "
                "Scale insects feed on sap and excrete sticky honeydew.\n"
                "Organic Treatments: Control insect vectors using horticultural oils or insecticidal soaps. Prune citrus trees to maximize sunlight and airflow.\n"
                "Prevention: Buy certified disease-free citrus trees and avoid moving citrus plants between regions."
            ),
            "chunk_index": 5,
            "page_number": 6,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "citrus"
        },
        # Book 7: Grapevine Care
        {
            "content": (
                "Book 7: Grapevine Care (Downy Mildew, Powdery Mildew, Black Rot)\n"
                "Grapevines are highly susceptible to Downy Mildew (Plasmopara viticola), which causes yellow-green 'oil spots' on upper leaves and white downy growth underneath. "
                "Powdery Mildew coats berries and leaves with greyish dust, splitting fruit. "
                "Black Rot causes leaves to develop reddish-brown spots and berries to shrivel into black mummies.\n"
                "Organic Treatments: Apply copper or sulfur fungicides preventative. Remove and destroy all shriveled grape mummies.\n"
                "Prevention: Prune vines using the double-guyot or canopy-training systems to maximize sun exposure and dry leaves quickly."
            ),
            "chunk_index": 6,
            "page_number": 7,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "grapes"
        },
        # Book 8: Cucurbit Care
        {
            "content": (
                "Book 8: Cucurbit Care (Zucchini, Cucumbers, Melons - Powdery Mildew, Cucumber Beetles)\n"
                "Cucurbits frequently suffer from Powdery Mildew (Podosphaera xanthii), covering leaves in white dust and causing premature drying. "
                "Cucumber Beetles transmit Bacterial Wilt (Erwinia tracheiphila), which causes vines to collapse and die overnight.\n"
                "Organic Treatments: Spray with neem oil or potassium bicarbonate. Use yellow sticky traps and row covers to exclude cucumber beetles.\n"
                "Prevention: Choose wilt-resistant varieties and maintain balanced soil moisture."
            ),
            "chunk_index": 7,
            "page_number": 8,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "cucurbits"
        },
        # Book 9: Soil Health & pH Management
        {
            "content": (
                "Book 9: Soil Health & pH Management (Soil Testing, pH Adjustments)\n"
                "Soil health is the foundation of plant vitality. Most vegetables prefer a pH of 6.0-7.0. "
                "Acidic soil (below 6.0) limits phosphorus and calcium availability. Alkaline soil (above 7.5) causes iron chlorosis, making leaves turn yellow while veins remain dark green.\n"
                "Organic adjustments: Add agricultural limestone to raise pH. Incorporate elemental sulfur or peat moss to lower pH.\n"
                "Prevention: Add organic compost regularly to buffer soil pH, improve structure, feed beneficial microbes, and enhance drainage."
            ),
            "chunk_index": 8,
            "page_number": 9,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "soil"
        },
        # Book 10: Composting Principles
        {
            "content": (
                "Book 10: Composting Principles (Carbon-to-Nitrogen Ratio, Aeration)\n"
                "Composting converts organic waste into nutrient-rich humus. The ideal Carbon-to-Nitrogen (C:N) ratio is 30:1. "
                "Browns (carbon-rich: straw, dry leaves, cardboard) provide energy. Greens (nitrogen-rich: vegetable scraps, fresh grass, coffee grounds) feed microbes.\n"
                "Management: Keep the pile damp like a wrung-out sponge. Turn the pile weekly to introduce oxygen and speed decomposition.\n"
                "Prevention: Avoid adding meat, dairy, weeds with seeds, or diseased plant matter to prevent pests and pathogens."
            ),
            "chunk_index": 9,
            "page_number": 10,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "compost"
        },
        # Book 11: Integrated Pest Management (IPM)
        {
            "content": (
                "Book 11: Integrated Pest Management (IPM) (Prevention, Monitoring, Controls)\n"
                "IPM is an environmentally sensitive approach to pest management. It relies on four tiers: "
                "1. Cultural controls (crop rotation, clean tools). 2. Physical/Mechanical controls (hand-picking pests, row covers). "
                "3. Biological controls (beneficial insects like ladybugs). 4. Chemical controls (used as a last resort, starting with organic options like neem oil).\n"
                "Action steps: Inspect plants daily for pests. Set action thresholds before spraying chemical pesticides."
            ),
            "chunk_index": 10,
            "page_number": 11,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "ipm"
        },
        # Book 12: Hydroponic Plant Care
        {
            "content": (
                "Book 12: Hydroponic Plant Care (Nutrient Solutions, EC, Pythium Root Rot)\n"
                "Hydroponics requires managing water quality. Electrical Conductivity (EC) measures nutrient strength; too high burns roots, too low causes deficiencies. "
                "Pythium Root Rot causes roots to turn brown, slimy, and smell foul, starving the plant of oxygen.\n"
                "Organic Treatments: Add beneficial microbes (mycorrhizae or Trichoderma) to outcompete root rot pathogens. Add hydrogen peroxide to oxygenate water.\n"
                "Prevention: Keep reservoir water temperature below 68°F (20°C) and sanitize all equipment."
            ),
            "chunk_index": 11,
            "page_number": 12,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "hydroponics"
        },
        # Book 13: Indoor Houseplant Care & Diseases
        {
            "content": (
                "Book 13: Indoor Houseplant Care & Diseases (Spider Mites, Fungus Gnats, Root Rot)\n"
                "Houseplants suffer from dry indoor air and poor drainage. Spider Mites create fine webbing under leaves, speckled yellow spots, and dusty residue. "
                "Fungus Gnats breed in wet topsoil. Overwatering leads to oxygen deprivation and root rot.\n"
                "Organic Treatments: Wash leaves with insecticidal soap or neem oil. Add yellow sticky cards for gnats. Apply systemic beneficial nematodes to soil.\n"
                "Prevention: Let the top 1-2 inches of soil dry completely between waterings. Use pots with drainage holes."
            ),
            "chunk_index": 12,
            "page_number": 13,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "houseplants"
        },
        # Book 14: Lawn & Turf Care
        {
            "content": (
                "Book 14: Lawn & Turf Care (Brown Patch, Dollar Spot, Weeds)\n"
                "Turfgrass is affected by Brown Patch (Rhizoctonia solani), showing circular patches of brown, dead grass with a dark ring. "
                "Dollar Spot causes straw-colored spots the size of a silver dollar.\n"
                "Organic Treatments: Apply cornmeal or bio-fungicides to suppress fungal spores. Improve soil structure via mechanical core aeration.\n"
                "Prevention: Mow grass tall (3 inches), water deeply but infrequently in the early morning, and fertilize with slow-release organic nitrogen."
            ),
            "chunk_index": 13,
            "page_number": 14,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "lawn"
        },
        # Book 15: Watering & Irrigation Systems
        {
            "content": (
                "Book 15: Watering & Irrigation Systems (Drip Irrigation, Rainwater Harvesting)\n"
                "Efficient watering saves resources and prevents foliage disease. Drip Irrigation delivers water directly to root zones, reducing evaporation and leaf wetness. "
                "Rainwater harvesting collects soft, chlorine-free water suitable for acid-loving plants.\n"
                "Best practices: Water deeply to encourage deep root systems. Use mulches (wood chips, straw) to lock in soil moisture.\n"
                "Prevention: Water early in the morning (4 AM - 8 AM) so any stray water on leaves dries before nightfall."
            ),
            "chunk_index": 14,
            "page_number": 15,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "irrigation"
        },
        # Book 16: Companion Planting Guide
        {
            "content": (
                "Book 16: Companion Planting Guide (Synergistic Crop Pairings)\n"
                "Companion planting pairs plants to naturally deter pests and improve growth. "
                "Tomatoes benefit from Basil (repels thrips and hornworms, improves flavor) and Marigolds (excretes alpha-terthienyl, reducing root-knot nematodes in soil). "
                "Carrots and Leeks protect each other: leeks repel carrot rust fly, carrots repel onion fly.\n"
                "Strategy: Mix flowers and herbs into vegetable beds to attract pollinators and beneficial insects."
            ),
            "chunk_index": 15,
            "page_number": 16,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "companion"
        },
        # Book 17: General Nutrient Deficiencies
        {
            "content": (
                "Book 17: General Nutrient Deficiencies (Nitrogen, Phosphorus, Potassium, Calcium)\n"
                "Nutrient deficiencies present distinct visual cues: "
                "1. Nitrogen: Overall yellowing of lower leaves. 2. Phosphorus: Purplish-tinted leaves and stunted roots. "
                "3. Potassium: Scorched or brown leaf margins. 4. Calcium: Blossom end rot in fruits or dead growing tips. "
                "5. Magnesium: Interveinal chlorosis (yellowing between veins) on older leaves.\n"
                "Organic Treatments: Apply kelp meal for potassium, bone meal for phosphorus, and Epsom salt (magnesium sulfate) for magnesium deficiencies."
            ),
            "chunk_index": 16,
            "page_number": 17,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "nutrients"
        },
        # Book 18: Organic Pest Controls
        {
            "content": (
                "Book 18: Organic Pest Controls (Neem Oil, Insecticidal Soaps, BT)\n"
                "Organic pest controls target pests with minimal environmental impact. "
                "Neem Oil contains azadirachtin, disrupting insect growth and feeding. "
                "Insecticidal Soaps dissolve insect outer cuticles (aphids, mites). "
                "Bacillus thuringiensis (BT) is a natural soil bacteria targeting caterpillars (tomato hornworms) without harming beneficial pollinators.\n"
                "Application: Spray in late evening when bees are inactive, and always dilute according to package instructions."
            ),
            "chunk_index": 17,
            "page_number": 18,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "organic"
        },
        # Book 19: Pruning & Training Plants
        {
            "content": (
                "Book 19: Pruning & Training Plants (Airflow, Sanitizing Shears)\n"
                "Pruning increases fruit size and decreases disease. In indeterminate tomatoes, remove suckers (small shoots in leaf axils) to focus energy. "
                "Pruning lower branches up to 12 inches off the ground prevents soil splash disease transmission.\n"
                "Safety Rules: Disinfect pruning shears with isopropyl alcohol or a 10% bleach solution between plants. "
                "Never prune plants when they are wet to prevent spreading spores and bacteria."
            ),
            "chunk_index": 18,
            "page_number": 19,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "pruning"
        },
        # Book 20: Beneficial Insects & Pollinators
        {
            "content": (
                "Book 20: Beneficial Insects & Pollinators (Ladybugs, Lacewings, Predatory Mites)\n"
                "Beneficial insects provide biological pest control. Ladybugs and Green Lacewings consume thousands of aphids, thrips, and mites. "
                "Hoverflies feed on aphids, and parasitic wasps lay eggs inside caterpillars. "
                "Predatory Mites (Phytoseiulus persimilis) consume pest spider mites.\n"
                "Action steps: Plant pollen-rich plants (dill, fennel, alyssum) to attract beneficials. Avoid broad-spectrum insecticides that kill both pests and helpers."
            ),
            "chunk_index": 19,
            "page_number": 20,
            "document_title": "PlantMD Master Botanical & Plant Disease Encyclopedia",
            "category": "beneficials"
        }
    ]
    
    # 3. Generate embeddings
    texts = [c["content"] for c in chunks]
    print(f"Generating embeddings for {len(chunks)} chapters...")
    embeddings = embed_texts(texts)
    
    # 4. Upsert to Qdrant
    print("Upserting master chunks to Qdrant...")
    upserted = upsert_chunks(doc_id, chunks, embeddings)
    print(f"Success! Master Encyclopedia loaded. Seeded {upserted} pages into Qdrant.")

if __name__ == "__main__":
    asyncio.run(seed_master_encyclopedia())
