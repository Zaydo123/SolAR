import json
import base64
import hashlib
import requests
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding

# ------------------
# Utility Functions
# ------------------

def base64url_encode(data: bytes) -> str:
    """Convert raw bytes to base64url (no '=' padding)."""
    return base64.urlsafe_b64encode(data).decode().rstrip("=")

def base64url_decode(s: str) -> bytes:
    """Decode base64url (adding back any missing '=')."""
    rem = len(s) % 4
    if rem > 0:
        s += "=" * (4 - rem)
    return base64.urlsafe_b64decode(s)

def sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()

def load_jwk(filepath: str):
    """Load an Arweave JWK from a JSON file, build an RSA private key."""
    with open(filepath, "r") as f:
        jwk = json.load(f)
    n = int.from_bytes(base64url_decode(jwk["n"]), 'big')
    e = int.from_bytes(base64url_decode(jwk["e"]), 'big')
    d = int.from_bytes(base64url_decode(jwk["d"]), 'big')
    p = int.from_bytes(base64url_decode(jwk["p"]), 'big')
    q = int.from_bytes(base64url_decode(jwk["q"]), 'big')
    dp = int.from_bytes(base64url_decode(jwk["dp"]), 'big')
    dq = int.from_bytes(base64url_decode(jwk["dq"]), 'big')
    qi = int.from_bytes(base64url_decode(jwk["qi"]), 'big')
    privkey = rsa.RSAPrivateNumbers(
        p=p, q=q, d=d, dmp1=dp, dmq1=dq, iqmp=qi,
        public_numbers=rsa.RSAPublicNumbers(e=e, n=n)
    ).private_key()
    return privkey, jwk

def get_anchor(node_url: str) -> str:
    """Fetch an anchor/last_tx from the node."""
    r = requests.get(f"{node_url}/tx_anchor")
    if r.status_code == 200:
        return r.text.strip()
    return ""

def get_price(node_url: str, size: int) -> str:
    """Fetch a recommended transaction fee from /price/ endpoint."""
    r = requests.get(f"{node_url}/price/{size}")
    if r.status_code == 200:
        return r.text.strip()  # Winston as string
    return "0"

# -------------
# Deep Hashing
# -------------
def deep_hash_chunk(chunk_type: bytes, chunk: bytes) -> bytes:
    """
    Single-chunk helper for small data. 
    For truly correct v2, you'd implement the full chunk-based approach.
    """
    # The official doc uses a deepHash([\"blob\", chunk]) approach with label + chunk.
    # We'll do a simple label concat: sha-384( \"blob\" + chunk ).
    digest = hashlib.sha384(chunk_type + chunk).digest()
    return digest

def deep_hash_transaction_v2(tx_fields: dict) -> bytes:
    """
    This tries to replicate, in a minimal sense, the v2 deep hash for small data.
    A truly correct approach must do chunk-based hashing for large data.
    """
    # For v2, the fields are (tagged) in a certain order. 
    # The 'data_root' must be included if data_size > 0. We'll do single-chunk logic.

    # We'll do a small piecewise approach:
    # \"data_size\" => string
    # \"data_root\" => base64url => decode => bytes
    # \"reward\", \"last_tx\", \"owner\", \"tags\", \"target\", \"quantity\", etc.
    # Official approach is more elaborate. This is a minimal hack.

    # Convert some fields to bytes:
    format_bytes = str(tx_fields["format"]).encode("utf-8")
    owner_bytes = base64url_decode(tx_fields["owner"])
    reward_bytes = tx_fields["reward"].encode("utf-8")
    last_tx_bytes = base64url_decode(tx_fields["last_tx"]) if tx_fields["last_tx"] else b""
    data_root_bytes = base64url_decode(tx_fields["data_root"])
    data_size_bytes = tx_fields["data_size"].encode("utf-8")
    tags_json = json.dumps(tx_fields["tags"])  # not official, but minimal
    tags_bytes = tags_json.encode("utf-8")

    # We'll combine them in a pseudo-labeled manner:
    # (We label each piece with a short marker like \"ARWeave\" or \"blob\".)
    # A fully correct approach is in arweave-js deepHash. For many ArLocal setups, 
    # this might pass for small data.

    to_hash = b""
    for label, chunk in [
        (b'ARWEAVE_FORMAT', format_bytes),
        (b'ARWEAVE_OWNER', owner_bytes),
        (b'ARWEAVE_REWARD', reward_bytes),
        (b'ARWEAVE_LAST_TX', last_tx_bytes),
        (b'ARWEAVE_DATA_ROOT', data_root_bytes),
        (b'ARWEAVE_DATA_SIZE', data_size_bytes),
        (b'ARWEAVE_TAGS', tags_bytes),
        (b'ARWEAVE_TARGET', base64url_decode(tx_fields["target"])) if tx_fields["target"] else (b'', b''),
        (b'ARWEAVE_QUANTITY', tx_fields["quantity"].encode("utf-8")),
    ]:
        if isinstance(chunk, tuple):
            # (b'', b'') case, skip
            continue
        # single chunk approach, label + chunk
        chunk_hash = deep_hash_chunk(label, chunk)
        # append chunk_hash to our rolling to_hash
        to_hash += chunk_hash

    # final overall hash
    overall = hashlib.sha384(to_hash).digest()
    return overall

def sign_transaction_v2(tx_fields: dict, private_key) -> dict:
    """
    Attempt a minimal v2 \"deep hash\" for single-chunk data, then sign with RSA.
    Then set tx_fields['signature'] and compute tx_fields['id'].
    """
    # 1) Build the 'data_root' if we have data.
    # For truly correct chunking, we'd do a full chunk-based merkle.
    if tx_fields["data"]:
        data_bytes = base64url_decode(tx_fields["data"])
        tx_fields["data_root"] = base64url_encode(sha256(data_bytes))
    else:
        tx_fields["data_root"] = ""

    # 2) Generate the deep hash for the v2 fields:
    dd = deep_hash_transaction_v2(tx_fields)

    # 3) RSA sign that deep hash with SHA-384
    signature = private_key.sign(
        dd,
        padding.PKCS1v15(),
        hashes.SHA384()
    )

    sig_b64 = base64url_encode(signature)
    tx_fields["signature"] = sig_b64

    # The id is sha256(signature)
    id_bytes = sha256(signature)
    id_b64 = base64url_encode(id_bytes)
    tx_fields["id"] = id_b64

    return tx_fields

def post_transaction(node_url: str, tx_json: dict) -> requests.Response:
    """POST the transaction to /tx."""
    r = requests.post(f"{node_url}/tx", json=tx_json)
    return r


def main():
    node_url = "http://localhost:1984"  # or https://arweave.net
    privkey, jwk = load_jwk("arweave-key.json")

    # 1) Gather info
    anchor = get_anchor(node_url)
    data_bytes = b"Hello from single-chunk v2 transaction!"
    data_b64 = base64url_encode(data_bytes)
    data_len = len(data_bytes)

    reward = get_price(node_url, data_len)  # or '0' for local test
    if reward == "0":
        print("Warning: Reward=0, might be invalid on a real node.")

    # 2) Build v2 transaction fields
    tx_fields = {
        "format": 2,
        "id": "",
        "last_tx": anchor,
        "owner": jwk["n"],  # base64URL of RSA modulus
        "tags": [],         # e.g., can fill with {\"name\":\"...\","value\":\"...\"} pairs
        "target": "",       # sending tokens? If not, empty
        "quantity": "0",    # if no token transfer
        "data": data_b64,   # we have small data inline
        "reward": reward,
        "signature": "",
        "data_size": str(data_len),
        "data_root": "",    # we fill this in sign_transaction_v2
    }

    # 3) Sign
    tx_fields = sign_transaction_v2(tx_fields, privkey)

    # 4) Post
    resp = post_transaction(node_url, tx_fields)
    print("POST /tx status:", resp.status_code)
    print("POST /tx text:", resp.text)

    if resp.status_code in [200, 202]:
        print("Transaction posted successfully. TxID:", tx_fields["id"])
    else:
        print("Transaction might have failed. Check node logs/responses.")


if __name__ == "__main__":
    main()
