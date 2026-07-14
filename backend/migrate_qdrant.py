import sys
import json
from pathlib import Path
import torch

# Limit PyTorch to 4 threads for optimal performance
torch.set_num_threads(4)

# Add backend to path to allow importing app modules
sys.path.append(str(Path(__file__).parent))

from app.services.vector_store import get_qdrant_client
from app.services.embedding import embed_texts
from app.config import get_settings
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
import uuid

def migrate():
    client = get_qdrant_client()
    settings = get_settings()
    collection_name = settings.QDRANT_COLLECTION

    # 1. Load backup from JSON file
    backup_path = Path(__file__).parent / "concise_encyclopedia_backup.json"
    if not backup_path.exists():
        print(f"Error: Backup file {backup_path} not found!")
        return

    with open(backup_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    print(f"Loaded {len(chunks)} total chunks from backup file.")

    # 2. Ensure collection is 1024 dimensions
    collections = client.get_collections().collections
    exists = any(c.name == collection_name for c in collections)
    
    if exists:
        # Check current collection dimension
        info = client.get_collection(collection_name=collection_name)
        config = info.config.params.vectors
        current_dim = getattr(config, "size", None)
        if current_dim != 1024:
            print(f"Deleting collection: {collection_name} (current dimension: {current_dim})...")
            client.delete_collection(collection_name=collection_name)
            exists = False

    if not exists:
        print(f"Creating collection: {collection_name} with 1024 dimensions...")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=1024,
                distance=Distance.COSINE,
            ),
        )
        # Create payload index for document_id
        from qdrant_client.models import PayloadSchemaType
        client.create_payload_index(
            collection_name=collection_name,
            field_name="document_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )
        print("Created payload index on document_id.")
    else:
        print(f"Collection {collection_name} already exists with correct dimensions.")

    # 3. Find already indexed chunk indices
    target_doc_id = "d162659f-95ef-442e-a262-fc9e15b76988"
    print("Checking already indexed chunks in Qdrant...")
    indexed_indices = set()
    offset = None
    try:
        while True:
            res, offset = client.scroll(
                collection_name=collection_name,
                limit=100,
                offset=offset,
                scroll_filter=Filter(
                    must=[FieldCondition(key="document_id", match=MatchValue(value=target_doc_id))]
                ),
                with_payload=True,
                with_vectors=False
            )
            if not res:
                break
            for p in res:
                chunk_idx = p.payload.get("chunk_index")
                if chunk_idx is not None:
                    indexed_indices.add(int(chunk_idx))
            if offset is None:
                break
    except Exception as e:
        print("Could not retrieve indexed chunks:", str(e))

    print(f"Found {len(indexed_indices)} already indexed chunks in Qdrant.")

    # Filter out chunks that are already indexed
    remaining_chunks = [c for c in chunks if int(c.get("chunk_index", 0)) not in indexed_indices]
    print(f"{len(remaining_chunks)} chunks remaining to process.")

    if not remaining_chunks:
        print("All chunks are already indexed! Migration complete.")
        return

    # Sort remaining chunks by chunk_index
    remaining_chunks.sort(key=lambda x: int(x.get("chunk_index", 0)))

    # 4. Re-embed and upsert the chunks in batches, saving immediately
    print("Re-embedding and upserting remaining chunks in batches of 32...")
    batch_size = 32
    total_batches = (len(remaining_chunks) + batch_size - 1) // batch_size
    
    import time
    start_time = time.time()

    for idx in range(0, len(remaining_chunks), batch_size):
        batch = remaining_chunks[idx : idx + batch_size]
        texts = [b["content"] for b in batch]
        
        batch_start = time.time()
        embeddings = embed_texts(texts, batch_size=batch_size)
        batch_end = time.time()
        
        points = []
        for item, embedding in zip(batch, embeddings):
            point_id = str(uuid.uuid4())
            points.append(PointStruct(
                id=point_id,
                vector=embedding,
                payload=item,
            ))
            
        # Upsert batch immediately
        client.upsert(
            collection_name=collection_name,
            points=points,
        )
        
        elapsed = batch_end - batch_start
        print(f"Batch {idx // batch_size + 1}/{total_batches} ({len(texts)} texts) embedded and upserted in {elapsed:.2f}s.")

    print(f"Migration completed in {time.time() - start_time:.2f}s!")

if __name__ == "__main__":
    migrate()
