# LocalMind Backend

This is the FastAPI backend for LocalMind.

## Current Structure

```text
backend/
  app/
    api/
      routes/
        documents.py
        health.py
        qa.py
    core/
      config.py
    schemas/
      document.py
      qa.py
    services/
      document_chunker.py
      document_catalog.py
      document_lifecycle.py
      document_metadata.py
      document_storage.py
      document_parser.py
      deepseek_client.py
      vector_store.py
    main.py
  data/
    documents.json
  .env.example
  requirements.txt
```

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` from `.env.example`, then fill in your DeepSeek API key:

```text
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_BASE=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

## Run

```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If the virtual environment is already created, start from:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Check

Open:

- http://127.0.0.1:8000/health
- http://127.0.0.1:8000/docs

## Upload Document

After installing dependencies and starting the backend, open:

- http://127.0.0.1:8000/docs

Then use:

```text
POST /api/documents/upload
```

Uploaded files are saved to:

```text
backend/uploads/
```

The saved filename is based on the PDF content hash. Uploading the same PDF
again returns the same `document_id` and does not save another copy.

## Import Document

For normal app usage, call this one-step import endpoint:

```text
POST /api/documents/import
```

It uploads the document, extracts text, chunks text, and indexes chunks into ChromaDB.

Supported file types:

```text
.pdf, .docx, .pptx, .txt, .md
```

Page/source behavior:

```text
PDF: page is the PDF page number.
PPTX: page is the slide number.
DOCX/TXT/MD: page is 1.
```

## List Documents

Call:

```text
GET /api/documents
```

It returns local document import status, including whether each document has
PDF, extracted text, chunks, and ChromaDB index data.

Document metadata is persisted to:

```text
backend/data/documents.json
```

## Get Document Detail

Call:

```text
GET /api/documents/{document_id}
```

It returns the persisted metadata for one document.

## Delete Document

Call:

```text
DELETE /api/documents/{document_id}
```

It deletes the PDF, extracted text, chunks, ChromaDB vectors, and metadata
record for that document. Missing generated files are reported but do not make
the request fail.

## Extract Document Text

After uploading a PDF, copy the returned `document_id` and call:

```text
POST /api/documents/{document_id}/extract-text
```

Extracted text is saved to:

```text
backend/extracted_text/
```

## Chunk Text

After extracting text, call:

```text
POST /api/documents/{document_id}/chunks
```

Default chunk settings:

```text
chunk_size=1000
chunk_overlap=200
```

Chunk files are saved to:

```text
backend/chunks/
```

## Index Chunks

After chunking text, call:

```text
POST /api/documents/{document_id}/index
```

The vector database is saved to:

```text
backend/chroma_db/
```

## Search Indexed Chunks

After indexing chunks, call:

```text
POST /api/qa/search
```

Example request:

```json
{
  "question": "How can the robot avoid obstacles?",
  "top_k": 5,
  "max_distance": 0.8,
  "document_id": null,
  "document_ids": null
}
```

`top_k` is the maximum number of chunks to retrieve. `max_distance` filters out
weakly related chunks after retrieval; distance is smaller when content is more
similar. If `max_distance` is omitted, the backend uses the default threshold.
If only 1 or 2 chunks pass the threshold, the API returns only those chunks and
does not fill the response with weaker matches.

## Ask With DeepSeek

After indexing chunks and configuring `DEEPSEEK_API_KEY`, call:

```text
POST /api/qa/ask
```

Example request:

```json
{
  "question": "How can the robot avoid obstacles?",
  "top_k": 5,
  "max_distance": 0.8,
  "document_id": null,
  "document_ids": null
}
```

Set `document_id` when you want to search inside one specific document only.
Set `document_ids` when you want to search inside selected documents only.
When both `document_id` and `document_ids` are omitted or `null`, LocalMind
searches across all indexed documents. Do not send both fields at the same time.

If no chunks pass the relevance threshold, `/api/qa/ask` returns a local message
instead of calling DeepSeek:

```text
根据当前知识库内容，未检索到与问题足够相关的文档片段。
```

## Settings

Call:

```text
GET /api/settings
```

It returns whether a DeepSeek API Key is configured. It never returns the full
API Key.

Call:

```text
POST /api/settings/deepseek
```

Example request:

```json
{
  "api_key": "your_deepseek_api_key_here",
  "model": "deepseek-chat",
  "api_base": "https://api.deepseek.com"
}
```

The API Key is saved to the backend `.env` file. In development this is
`backend/.env`. In the packaged Windows app this is stored under:

```text
%APPDATA%\LocalMind\backend\.env
```
