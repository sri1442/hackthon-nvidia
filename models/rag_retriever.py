"""
RAG Retriever for AGV Maintenance Knowledge Base.

Adapted from brevdev/workshop-build-an-agent (Module 2: Agentic RAG) pattern:
DirectoryLoader -> RecursiveCharacterTextSplitter -> NVIDIAEmbeddings -> FAISS
-> NVIDIARerank -> ContextualCompressionRetriever

Supports both local self-hosted NIM endpoints and NVIDIA's cloud NIM API,
selected via environment variables (same .env used by the rest of the project).
"""
import os
import logging
from pathlib import Path

from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_community.vectorstores import FAISS
from langchain_classic.text_splitter import RecursiveCharacterTextSplitter
from langchain_classic.retrievers import ContextualCompressionRetriever
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings, NVIDIARerank

_LOGGER = logging.getLogger(__name__)

# ── Load .env (same pattern as agents/diagnostician.py) ───────────────────────
def _load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    os.environ.setdefault(k.strip(), v.strip())

_load_env()

# ── Configuration ──────────────────────────────────────────────────────────────
KB_DIR       = Path(__file__).parent.parent / "data" / "maintenance_kb"
INDEX_DIR    = Path(__file__).parent.parent / "data" / "kb_faiss_index"
CHUNK_SIZE   = 800
CHUNK_OVERLAP = 120
RETRIEVE_K   = 6      # candidates fetched before reranking
RERANK_TOP_N = 3      # final snippets returned after reranking

NGC_KEY = os.getenv("NGC_API_KEY", "")

# Embedding model — local NIM or cloud NIM, selected by base_url
EMBED_BASE_URL  = os.getenv("NIM_EMBED_BASE_URL", "https://integrate.api.nvidia.com/v1")
EMBED_MODEL     = os.getenv("NIM_EMBED_MODEL_NAME", "nvidia/llama-nemotron-embed-1b-v2")

# Reranking model — local NIM or cloud NIM, selected by base_url
RERANK_BASE_URL = os.getenv("NIM_RERANK_BASE_URL", "https://integrate.api.nvidia.com/v1")
RERANK_MODEL    = os.getenv("NIM_RERANK_MODEL_NAME", "nvidia/llama-nemotron-rerank-1b-v2")


def _get_embeddings() -> NVIDIAEmbeddings:
    return NVIDIAEmbeddings(
        model=EMBED_MODEL,
        base_url=EMBED_BASE_URL,
        api_key=NGC_KEY,
        truncate="END",
    )


def _get_reranker() -> NVIDIARerank:
    return NVIDIARerank(
        model=RERANK_MODEL,
        base_url=RERANK_BASE_URL,
        api_key=NGC_KEY,
        top_n=RERANK_TOP_N,
    )


def build_index(kb_dir: Path = KB_DIR, index_dir: Path = INDEX_DIR) -> FAISS:
    """
    Ingest all text files in kb_dir, chunk them, embed them, and build/persist
    a FAISS index to index_dir. Run this once (or whenever KB docs change) via
    models/build_kb_index.py — do NOT call this on every process start.
    """
    _LOGGER.info(f"Reading maintenance knowledge base from {kb_dir}")
    loader = DirectoryLoader(str(kb_dir), glob="**/*.txt", loader_cls=TextLoader,
                              show_progress=True)
    docs = loader.load()
    if not docs:
        raise RuntimeError(f"No documents found in {kb_dir}")

    _LOGGER.info(f"Chunking {len(docs)} documents (size={CHUNK_SIZE}, overlap={CHUNK_OVERLAP})")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP
    )
    chunks = splitter.split_documents(docs)

    _LOGGER.info(f"Embedding {len(chunks)} chunks and building FAISS index")
    embeddings = _get_embeddings()
    vectordb = FAISS.from_documents(chunks, embeddings)

    index_dir.mkdir(parents=True, exist_ok=True)
    vectordb.save_local(str(index_dir))
    _LOGGER.info(f"Saved FAISS index to {index_dir}")
    return vectordb


def load_index(index_dir: Path = INDEX_DIR) -> FAISS:
    """Load a previously built FAISS index from disk."""
    if not index_dir.exists():
        raise FileNotFoundError(
            f"No FAISS index found at {index_dir}. "
            f"Run `python models/build_kb_index.py` first."
        )
    embeddings = _get_embeddings()
    return FAISS.load_local(
        str(index_dir), embeddings, allow_dangerous_deserialization=True
    )


_retriever_cache = None


def get_retriever(index_dir: Path = INDEX_DIR) -> ContextualCompressionRetriever:
    """
    Returns a retriever that does similarity search (FAISS) followed by
    reranking (NVIDIARerank) -> ContextualCompressionRetriever, matching the
    Module 2 reference pattern. Cached after first call.
    """
    global _retriever_cache
    if _retriever_cache is not None:
        return _retriever_cache

    vectordb = load_index(index_dir)
    kb_retriever = vectordb.as_retriever(
        search_type="similarity", search_kwargs={"k": RETRIEVE_K}
    )
    reranker = _get_reranker()
    _retriever_cache = ContextualCompressionRetriever(
        base_retriever=kb_retriever,
        base_compressor=reranker,
    )
    return _retriever_cache


def retrieve_context(query: str) -> list[dict]:
    """
    Retrieve the top reranked KB snippets for a query string.
    Returns a list of {"content": str, "source": str} dicts.
    On any retriever error (index missing, NIM unreachable), returns an
    empty list so callers can gracefully fall back to no-KB-context behavior.
    """
    try:
        retriever = get_retriever()
        results = retriever.invoke(query)
        return [
            {
                "content": doc.page_content,
                "source": doc.metadata.get("source", "unknown"),
            }
            for doc in results
        ]
    except Exception as e:
        _LOGGER.warning(f"RAG retrieval failed, continuing without KB context: {e}")
        return []


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    build_index()
 