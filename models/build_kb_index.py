"""
One-time script to build and persist the FAISS index for the maintenance KB.

Usage:
    python build_kb_index.py

Run again whenever data/maintenance_kb/*.txt files change.
"""
import logging
from rag_retriever import build_index

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    build_index()
    print("\nKB index built successfully at data/kb_faiss_index/")
 