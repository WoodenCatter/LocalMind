# LocalMind Frontend

Electron + React + TypeScript + Vite + Tailwind CSS frontend for LocalMind.

## Install

```powershell
cd D:\LocalMind_project\frontend
npm.cmd install
```

Use `npm.cmd` in PowerShell if `npm` is blocked by the execution policy.

## Development

```powershell
npm.cmd run dev
```

This starts Vite on:

```text
http://127.0.0.1:5173
```

Then Electron opens the React app in a desktop window.

## Backend

The backend should be started separately:

```powershell
cd D:\LocalMind_project\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The frontend is prepared to call:

```text
http://127.0.0.1:8000
```

## MVP Features

- Fetch document list from `GET /api/documents`
- Import PDF/DOCX/PPTX/TXT/MD through `POST /api/documents/import`
- Delete documents through `DELETE /api/documents/{document_id}`
- Ask questions through `POST /api/qa/ask`
- Show source excerpts returned by the backend
- Search and filter documents in the sidebar
- Ask across the whole library or selected documents
- Adjust retrieval quality with `top_k` and `max_distance`

## Retrieval Settings

`top_k` is the maximum number of chunks to retrieve.

`max_distance` is the relevance threshold. Distance is smaller when content is
more related. A stricter value such as `0.6` returns fewer sources; a looser
value such as `1.0` returns more possible matches. The recommended default is
the backend default, currently `0.8`.

## Troubleshooting

- If documents do not load, confirm the backend is running on `http://127.0.0.1:8000`.
- If upload fails, check whether the file extension is one of `.pdf`, `.docx`, `.pptx`, `.txt`, `.md`.
- If asking fails, confirm `backend/.env` contains `DEEPSEEK_API_KEY` and the document collection has indexed chunks.
- If Electron fails to start after reinstalling dependencies, confirm `node_modules/electron/dist/electron.exe` exists and `node_modules/electron/path.txt` contains `electron.exe` without a trailing newline.
