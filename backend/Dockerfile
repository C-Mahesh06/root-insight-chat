FROM python:3.12-slim

WORKDIR /app

# System deps for PyMuPDF
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc g++ && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Pre-download models at build time — eliminates cold-start memory spike
# and avoids downloading during the first live request.
RUN python -c "
from sentence_transformers import SentenceTransformer, CrossEncoder
print('Downloading embedding model...')
SentenceTransformer('BAAI/bge-small-en-v1.5')
print('Downloading reranker model...')
CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2', max_length=512)
print('Models pre-baked successfully.')
"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
