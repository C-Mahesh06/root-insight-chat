import asyncio
import sys
from pathlib import Path

# Add backend to path to allow importing app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.services.embedding import embed_texts
from app.services.vector_store import upsert_chunks, ensure_collection
from app.middleware.auth import get_supabase

async def seed_global_encyclopedia():
    user_id = "b1522832-2926-4188-a67e-55a084996c60" # Mahesh's user ID
    supabase = get_supabase()
    
    # 1. Create document entry
    doc_data = {
        "title": "PlantMD Global & International Plant Disease Encyclopedia",
        "storage_path": "uploads/global_botanical_encyclopedia.pdf",
        "file_size": 95000,
        "page_count": 15,
        "uploaded_by": user_id,
        "status": "ready"
    }
    
    doc_res = supabase.table("documents").insert(doc_data).execute()
    if not doc_res.data:
        print("Failed to insert global document metadata")
        return
        
    doc_id = doc_res.data[0]["id"]
    print(f"Created Global Encyclopedia metadata with ID: {doc_id}")
    
    # 2. Define 15 Detailed Global Botanical/Agricultural Chapters (Books)
    chunks = [
        # Book 21: Rice Diseases in Asia
        {
            "content": (
                "Book 21: Rice Diseases in Asia (Rice Blast, Bacterial Leaf Blight, Sheath Blight)\n"
                "Rice crops across Asia, especially in major producing regions like China, India, and Southeast Asia, are vulnerable to critical pathogens. "
                "Rice Blast (Magnaporthe oryzae) affects all growth stages, presenting as spindle-shaped lesions with ash-colored centers on leaves (leaf blast) or causing rotting of the neck node (neck blast), resulting in empty panicles. "
                "Bacterial Leaf Blight (Xanthomonas oryzae pv. oryzae) causes water-soaked stripes that turn yellow-grey, leading to leaf wilting ('kresek' stage in seedlings). "
                "Sheath Blight (Rhizoctonia solani) produces large, greenish-grey ovoid lesions with dark borders on sheaths, causing lodging.\n"
                "Organic Treatments: Apply bio-control agents containing Pseudomonas fluorescens or Bacillus subtilis. Spray diluted silica-rich foliar feeds to strengthen leaf epidermis.\n"
                "Prevention: Avoid excessive nitrogen fertilizer which triggers lush growth susceptible to blast, plant resistant rice varieties, and practice field sanitation by clearing straw residue."
            ),
            "chunk_index": 0,
            "page_number": 1,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "rice"
        },
        # Book 22: Cassava Diseases in Africa
        {
            "content": (
                "Book 22: Cassava Diseases in Africa (Cassava Mosaic Disease - CMD, Cassava Brown Streak Disease - CBSD)\n"
                "Cassava is a primary staple crop in Sub-Saharan Africa. Cassava Mosaic Disease (CMD), transmitted by whiteflies (Bemisia tabaci) and infected cuttings, causes mosaic-like chlorotic patches on leaves, leaf distortion, and severely stunted tuber yields. "
                "Cassava Brown Streak Disease (CBSD), caused by ipomoviruses, presents as chlorosis along secondary leaf veins and brown necrotic streaks on the stem, turning the edible tuber starch into brown, corky, inedible rot.\n"
                "Organic Treatments: There are no chemical or organic cures for viral infections once established. Remove and burn diseased plants immediately.\n"
                "Prevention: Plant clean, certified virus-free stem cuttings, introduce whitefly-resistant crop systems, and use CMD/CBSD resistant cassava cultivars developed by international research bodies (like IITA)."
            ),
            "chunk_index": 1,
            "page_number": 2,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "cassava"
        },
        # Book 23: Coffee Diseases in Latin America
        {
            "content": (
                "Book 23: Coffee Diseases in Latin America (Coffee Rust - Roya, Coffee Berry Borer)\n"
                "Coffee plantations in Central and South America (e.g., Brazil, Colombia, Guatemala) face major threats. "
                "Coffee Leaf Rust (Hemileia vastatrix), known as 'Roya', causes powdery orange-yellow pustules on leaf undersides, reducing photosynthesis and leading to complete defoliation and dieback of coffee trees. "
                "The Coffee Berry Borer (Hypothenemus hampei) is a tiny beetle that drills into coffee cherries, destroying the beans inside.\n"
                "Organic Treatments: Use organic copper fungicides (Bordeaux mixture) preventatively. Deploy Beauveria bassiana (a beneficial entomopathogenic fungus) to parasitize and control the coffee berry borer beetle.\n"
                "Prevention: Increase shade management to avoid high humidity, space trees for optimal ventilation, and plant rust-resistant cultivars (like Castillo or Obata)."
            ),
            "chunk_index": 2,
            "page_number": 3,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "coffee"
        },
        # Book 24: Wheat & Barley Rusts in Europe & Australia
        {
            "content": (
                "Book 24: Wheat & Barley Rusts in Europe & Australia (Stem Rust, Stripe Rust, Leaf Rust)\n"
                "Cereal grain belts in Europe, Australia, and North America suffer from rust diseases. "
                "Stem Rust (Puccinia graminis) causes dark reddish-brown, elongated pustules on stems and leaves, rupturing the epidermis and causing plants to lodge. "
                "Stripe Rust (Puccinia striiformis) presents as linear yellow pustules along leaf veins, resembling stripes. "
                "Leaf Rust (Puccinia triticina) produces small, round, orange-brown pustules on leaf surfaces.\n"
                "Organic Treatments: Spray preventative sulfur formulations early in the season. Feed plants with seaweed extract to boost systemic acquired resistance (SAR).\n"
                "Prevention: Plant wheat cultivars with Sr genes (stem rust resistance genes like Sr2), rotate crops, and eradicate alternative hosts (like barberry bushes) near grain fields."
            ),
            "chunk_index": 3,
            "page_number": 4,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "wheat"
        },
        # Book 25: Maize (Corn) Diseases in North & South America
        {
            "content": (
                "Book 25: Maize (Corn) Diseases in North & South America (Northern Corn Leaf Blight, Maize Dwarf Mosaic, Southern Rust)\n"
                "Corn crops in the US Corn Belt and South America (Brazil, Argentina) are affected by fungal pathogens. "
                "Northern Corn Leaf Blight (Exserohilum turcicum) causes large, cigar-shaped, grayish-green lesions on leaves, which later turn tan and dry. "
                "Southern Rust (Puccinia polysora) causes orange pustules, primarily on the upper leaf surface, in warm, humid weather. "
                "Maize Dwarf Mosaic Virus (MDMV) causes mottling, yellow streaks, and stunting, spread by aphids.\n"
                "Organic Treatments: Spray with organic bio-fungicides containing Bacillus amyloliquefaciens to suppress blight.\n"
                "Prevention: Rotate crops with soybeans or alfalfa to break the fungal lifecycle, practice deep tillage to bury crop debris, and plant disease-resistant hybrids."
            ),
            "chunk_index": 4,
            "page_number": 5,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "maize"
        },
        # Book 26: Banana Diseases in Tropical Regions
        {
            "content": (
                "Book 26: Banana Diseases in Tropical Regions (Panama Disease/Fusarium Wilt TR4, Black Sigatoka)\n"
                "Global banana production is threatened by virulent pathogens. Panama Disease (Fusarium oxysporum f. sp. cubense Tropical Race 4 - TR4) is a soil-borne fungus that invades the vascular system of Cavendish bananas, causing yellowing leaf margins, wilting, stem splitting, and plant death. It can persist in soil for decades. "
                "Black Sigatoka (Pseudocercospora fijiensis) causes dark brown streaks on leaves, progressing to large necrotic spots, reducing fruit yield and quality.\n"
                "Organic Treatments: No cure exists for TR4; strict quarantine is the only defense. For Black Sigatoka, apply mineral oils and copper fungicides, and prune infected leaves.\n"
                "Prevention: Use tissue-cultured disease-free planting material, sanitize tools and footwear to prevent TR4 spread, and research replacement cultivars."
            ),
            "chunk_index": 5,
            "page_number": 6,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "banana"
        },
        # Book 27: Cacao Diseases in West Africa & South America
        {
            "content": (
                "Book 27: Cacao Diseases in West Africa & South America (Swollen Shoot Virus, Witches' Broom, Black Pod Rot)\n"
                "Cacao, source of chocolate, suffers from severe pathogens in West Africa (Ivory Coast, Ghana) and South America. "
                "Cacao Swollen Shoot Virus (CSSV), spread by mealybugs, causes swollen stems, leaf chlorosis, and tree death within 2-3 years. "
                "Witches' Broom (Moniliophthora perniciosa) causes abnormal, broom-like shoots and distorted pods. "
                "Black Pod Rot (Phytophthora palmivora) causes dark, rotting lesions on cacao pods, turning them black and powdery.\n"
                "Organic Treatments: Spray copper hydroxide preventatively for Black Pod Rot. Apply neem oil to suppress mealybug vectors.\n"
                "Prevention: Eradicate infected trees immediately (CSSV control), prune cacao trees to keep the canopy open and dry, and select tolerant hybrid clones."
            ),
            "chunk_index": 6,
            "page_number": 7,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "cacao"
        },
        # Book 28: Olive Orchard Diseases in the Mediterranean
        {
            "content": (
                "Book 28: Olive Orchard Diseases in the Mediterranean (Olive Peacock Spot, Verticillium Wilt, Olive Fruit Fly)\n"
                "Olive groves across Spain, Italy, Greece, and North Africa face severe stress. "
                "Peacock Spot (Venturia oleaginea) causes dark green to black circular spots with yellow halos on leaves, leading to defoliation. "
                "Verticillium Wilt (Verticillium dahliae) is a soil-borne fungus causing leaves on individual branches to roll inward, turn brown, and die (known as 'apoplexy'). "
                "The Olive Fruit Fly (Bactrocera oleae) lays eggs inside olives, causing fruit rot and acidity.\n"
                "Organic Treatments: Apply copper fungicide after harvest and before spring rains for Peacock Spot. Deploy clay (kaolin) sprays and organic traps with spinosad bait for the Olive Fruit Fly.\n"
                "Prevention: Avoid overwatering, practice solarization to reduce soil Verticillium, and select resistant cultivars like Frantoio."
            ),
            "chunk_index": 7,
            "page_number": 8,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "olive"
        },
        # Book 29: Coconut Palms in the Pacific & Caribbean
        {
            "content": (
                "Book 29: Coconut Palms in the Pacific & Caribbean (Lethal Yellowing, Bud Rot)\n"
                "Coconut and ornamental palms in the Caribbean, Florida, and Pacific islands are damaged by Lethal Yellowing. "
                "Lethal Yellowing is caused by a phytoplasma (bacteria-like organism) spread by the planthopper Haplaxius crudus. "
                "Symptoms include premature nut drop, blackening flower stalks, and yellowing of the fronds progressing from bottom to top, killing the palm in 3-5 months. "
                "Bud Rot (Phytophthora palmivora) decays the central growing bud, causing it to collapse and emit a foul odor.\n"
                "Organic Treatments: No cure for Lethal Yellowing. Treat Bud Rot early with organic copper-based fungicides poured into the palm crown.\n"
                "Prevention: Plant resistant varieties (e.g., Malayan Dwarf, Maypan hybrid) and control planthopper insects."
            ),
            "chunk_index": 8,
            "page_number": 9,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "coconut"
        },
        # Book 30: Vineyard Care in Oceania & South Africa
        {
            "content": (
                "Book 30: Vineyard Care in Oceania & South Africa (Downy Mildew, Phylloxera, Pierce's Disease)\n"
                "Vineyards in Australia, New Zealand, South Africa, and California face specific biosecurity concerns. "
                "Phylloxera (Daktulosphaira vitifoliae) is a microscopic aphid-like insect that feeds on grapevine roots, causing swelling and death. "
                "Pierce's Disease (caused by Xylella fastidiosa and spread by sharpshooter insects) blocks water transport, leading to scorched leaf margins, shriveled berries, and vine death.\n"
                "Organic Treatments: Use pyrethrum-based sprays to target sharpshooters. Apply copper fungicides to manage mildew.\n"
                "Prevention: Graft Vitis vinifera vines onto phylloxera-resistant North American rootstocks (e.g., Richter 110, Paulsen 1103) and implement strict quarantine."
            ),
            "chunk_index": 9,
            "page_number": 10,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "grapes"
        },
        # Book 31: Sweet Potato Diseases in East Asia
        {
            "content": (
                "Book 31: Sweet Potato Diseases in East Asia (Feathery Mottle Virus, Black Rot)\n"
                "Sweet potatoes in China, Japan, and Korea face viral and fungal issues. "
                "Sweet Potato Feathery Mottle Virus (SPFMV), transmitted by aphids, causes purple feather-like patterns along leaf veins, but mostly triggers severe growth reduction and cracked, low-quality tubers when co-infected with other viruses (Sweet Potato Virus Disease - SPVD). "
                "Black Rot (Ceratocystis fimbriata) causes dark, sunken, circular lesions on sweet potato roots, making them bitter and toxic.\n"
                "Organic Treatments: Remove and destroy infected vines immediately. Soak seed roots in hot water (120°F/49°C) for 10 minutes prior to bedding.\n"
                "Prevention: Use virus-free tissue culture slips, practice 3-4 year crop rotations, and store harvested tubers in sanitized crates."
            ),
            "chunk_index": 10,
            "page_number": 11,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "sweetpotato"
        },
        # Book 32: Soybeans in South America
        {
            "content": (
                "Book 32: Soybeans in South America (Asian Soybean Rust, Stem Canker)\n"
                "South American soybean giants (Brazil, Argentina, Paraguay) are heavily impacted by fungal rust. "
                "Asian Soybean Rust (Phakopsora pachyrhizi) causes small, tan-to-brown lesions with volcanic-like pustules on leaf undersides, leading to yellowing, rapid defoliation, and massive yield loss. "
                "Stem Canker (Diaporthe phaseolorum) causes dark brown-to-reddish lesions on stems, girdling the plant.\n"
                "Organic Treatments: Apply bio-fungicides based on Bacillus subtilis or copper hydroxide before canopy closure.\n"
                "Prevention: Enforce a mandatory host-free period (empty period/vazio sanitário) in winter to eliminate green bridge hosts, plant early-maturing varieties, and use rust-resistant cultivars."
            ),
            "chunk_index": 11,
            "page_number": 12,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "soybean"
        },
        # Book 33: Cotton Diseases in Central Asia & Egypt
        {
            "content": (
                "Book 33: Cotton Diseases in Central Asia & Egypt (Verticillium Wilt, Cotton Leaf Curl Virus, Bacterial Blight)\n"
                "Cotton cultivation in Uzbekistan, China, and Egypt faces persistent pathogens. "
                "Verticillium Wilt (Verticillium dahliae) causes yellowing margins on leaves (tiger-stripe pattern) and dark brown discoloration of internal stem tissues, causing wilting. "
                "Cotton Leaf Curl Virus (CLCuV), spread by whiteflies, causes leaf curling, thickened veins, and cup-like leaf outgrowths (enations). "
                "Bacterial Blight (Xanthomonas citri pv. malvacearum) causes angular water-soaked leaf lesions.\n"
                "Organic Treatments: Spray neem oil or potassium soap to reduce whitefly vectors. Use Bacillus amyloliquefaciens as a soil drench.\n"
                "Prevention: Rotate cotton with wheat or rice, practice deep conservation tillage, and plant resistant upland cotton varieties."
            ),
            "chunk_index": 12,
            "page_number": 13,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "cotton"
        },
        # Book 34: Sugarcane Diseases in South Asia & Brazil
        {
            "content": (
                "Book 34: Sugarcane Diseases in South Asia & Brazil (Red Rot, Sugarcane Smut, Grassy Shoot)\n"
                "Sugarcane production in Brazil and India suffers from systemic infections. "
                "Red Rot (Colletotrichum falcatum) is known as the 'cancer of sugarcane', causing red internal discolored lesions with white crossbands inside the stalk, making the sugarcane smell sour and reducing sugar content. "
                "Sugarcane Smut (Sporisorium scitamineum) produces a prominent, dusty black whip-like structure from the growing tip. "
                "Grassy Shoot is a phytoplasma disease causing thin, chlorotic, grass-like tillers.\n"
                "Organic Treatments: No cure for infected stalks. Dip seed setts in hot water (122°F/50°C) with organic disinfectants for 2 hours before planting.\n"
                "Prevention: Use disease-free seed setts, practice proper crop rotation, and select smut-resistant hybrids."
            ),
            "chunk_index": 13,
            "page_number": 14,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "sugarcane"
        },
        # Book 35: Tea Plantation Care in East & South Asia
        {
            "content": (
                "Book 35: Tea Plantation Care in East & South Asia (Blister Blight, Red Rust, Tea Mosquito Bug)\n"
                "Tea gardens in India (Assam, Darjeeling), China, Sri Lanka, and Kenya are affected by weather-dependent pests. "
                "Blister Blight (Exobasidium vexans) causes translucent, circular spots on young tea leaves, which turn into white, powdery blisters on leaf undersides, ruining the tea pluck. "
                "Red Rust is an algal disease (Cephaleuros virescens) causing orange-brown velvety spots on stems. "
                "The Tea Mosquito Bug (Helopeltis) punctures tender leaves, injecting toxic saliva and creating brown spots.\n"
                "Organic Treatments: Spray copper fungicides at 7-10 day intervals during the monsoon. Apply herbal extracts (such as garlic-chilli extract) to repel mosquito bugs.\n"
                "Prevention: Prune tea bushes at correct cycles to maintain a flat plucking table, improve drainage to lower humidity, and keep shade trees pruned."
            ),
            "chunk_index": 14,
            "page_number": 15,
            "document_title": "PlantMD Global & International Plant Disease Encyclopedia",
            "category": "tea"
        }
    ]
    
    # 3. Generate embeddings
    texts = [c["content"] for c in chunks]
    print(f"Generating embeddings for {len(chunks)} global chapters...")
    embeddings = embed_texts(texts)
    
    # 4. Upsert to Qdrant
    ensure_collection()
    print("Upserting global chunks to Qdrant...")
    upserted = upsert_chunks(doc_id, chunks, embeddings)
    print(f"Success! Global Encyclopedia loaded. Seeded {upserted} pages into Qdrant.")

if __name__ == "__main__":
    asyncio.run(seed_global_encyclopedia())
