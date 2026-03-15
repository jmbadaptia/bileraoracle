"""Minimal OpenAI-compatible embedding proxy for OCI Gen AI."""

import os
import time
import oci
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

OCI_COMPARTMENT_ID = os.environ.get("OCI_COMPARTMENT_ID")
OCI_REGION = os.environ.get("OCI_REGION", "eu-frankfurt-1")
OCI_MODEL = os.environ.get("OCI_EMBED_MODEL", "cohere.embed-multilingual-v3.0")

# Load OCI config from file
config = oci.config.from_file("/root/.oci/config", "DEFAULT")
client = oci.generative_ai_inference.GenerativeAiInferenceClient(config)


class EmbeddingRequest(BaseModel):
    model: str = "embeddings"
    input: str | list[str]
    dimensions: int | None = None


@app.post("/v1/embeddings")
def embed(req: EmbeddingRequest):
    inputs = [req.input] if isinstance(req.input, str) else req.input

    if len(inputs) > 96:
        raise HTTPException(400, "Max 96 inputs per request")

    try:
        response = client.embed_text(
            oci.generative_ai_inference.models.EmbedTextDetails(
                inputs=inputs,
                serving_mode=oci.generative_ai_inference.models.OnDemandServingMode(
                    model_id=OCI_MODEL
                ),
                compartment_id=OCI_COMPARTMENT_ID,
                input_type="SEARCH_DOCUMENT",
            )
        )
    except Exception as e:
        raise HTTPException(500, f"OCI embedding failed: {e}")

    data = []
    total_tokens = 0
    for i, emb in enumerate(response.data.embeddings):
        data.append({
            "object": "embedding",
            "index": i,
            "embedding": emb,
        })
        # Approximate token count (1 token ≈ 4 chars)
        total_tokens += len(inputs[i]) // 4

    return {
        "object": "list",
        "data": data,
        "model": OCI_MODEL,
        "usage": {
            "prompt_tokens": total_tokens,
            "total_tokens": total_tokens,
        },
    }


@app.get("/health")
def health():
    return {"status": "ok"}
