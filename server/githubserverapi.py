from flask import Flask, request, jsonify, Response
import os
import subprocess
import requests
import hashlib
import json
# from solana.publickey import PublicKey
from solders.pubkey import Pubkey
# from solana.transaction import Transaction
from solders.transaction import Transaction
# from solana.signature import Keypair
from solders.keypair import Keypair
from solana.rpc.api import Client

# Imports for Arweave and Solana interactions
# import arweave

app = Flask(__name__)
REPO_DIR = "./repos"
ARWEAVE_STORAGE_MODULE = "shaura_storage_module"  # Placeholder for storage module
SOLANA_PROGRAM_ID = "solana_program_id"  # Placeholder for Solana program ID
SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com"  # Solana RPC endpoint
SOLANA_CLIENT = Client(SOLANA_RPC_URL)  # Solana Client initialization

# Ensure the repos directory exists
os.makedirs(REPO_DIR, exist_ok=True)

# Helper function to interact with Arweave storage
def upload_packfile_to_arweave(packfile_path, repo_id, commit_hash):
    with open(packfile_path, 'rb') as packfile:
        # Generate tags for the Arweave transaction
        tags = {
            "RepoID": repo_id,
            "CommitHash": commit_hash
        }
        response = requests.post(
            f"http://arweave.net/upload", 
            files={'file': packfile},
            data={'tags': json.dumps(tags)}  # Adding metadata tags
        )
        return response.json().get('transaction_id')  # Arweave transaction ID

def fetch_packfile_from_arweave(transaction_id):
    response = requests.get(f"http://arweave.net/{transaction_id}")
    if response.status_code == 200:
        return response.content
    else:
        raise Exception("Failed to retrieve packfile from Arweave")

def authenticate_user_via_solana(token):
    # Decode and verify the Solana signature (simplified)
    # Here we assume the token is the signed message and will decode it using Solana's Ed25519 signature
    if not token:
        return False
    try:
        decoded_token = json.loads(token)  # Assuming token contains user signature info
        message = decoded_token["message"]
        signature = decoded_token["signature"]
        public_key = Pubkey.from_string(decoded_token["public_key"])

        # Verifying the signature
        if SOLANA_CLIENT.verify_message(message, signature, public_key):
            return True
    except Exception as e:
        print(f"Authentication failed: {e}")
    return False

def update_repo_state_in_solana(repo_name, commit_hash, arweave_tx):
    # Update repository state in Solana (this function needs to be implemented in your smart contract)
    transaction = Transaction()
    # Your logic to create the Solana transaction to update the repo state
    # Example: adding instruction to update the repository state with commit and arweave transaction ID
    # solana_program_id, repo_name, commit_hash, arweave_tx should be parameters in the transaction instruction

    response = SOLANA_CLIENT.send_transaction(transaction)
    if response.get("error"):
        raise Exception("Failed to update Solana repo state")

@app.route("/repos", methods=["GET"])
def list_repos():
    repos = [d for d in os.listdir(REPO_DIR) if os.path.isdir(os.path.join(REPO_DIR, d))]
    return jsonify(repos)

@app.route("/repos", methods=["POST"])
def create_repo():
    data = request.json
    repo_name = data.get("name")
    if not repo_name:
        return jsonify({"error": "Repository name is required"}), 400
    
    repo_path = os.path.join(REPO_DIR, f"{repo_name}.git")
    if os.path.exists(repo_path):
        return jsonify({"error": "Repository already exists"}), 400
    
    subprocess.run(["git", "init", "--bare", repo_path], check=True)
    return jsonify({"message": f"Repository '{repo_name}' created successfully"})

# @app.route("/repos/<repo_name>.git/git-receive-pack", methods=["POST"])
@app.route("/info/refs", methods=["GET"])
def receive_push():
# might need only one endpoint to recieve the pack, the type of request is determined is the query params
    # get query params
    service = request.args.get('service')
    print("Received service call")
    print(service)
    print(request.args)

    # token = request.headers.get('Authorization')
    # if not authenticate_user_via_solana(token):
    #     return jsonify({"error": "Unauthorized"}), 403
    
    repo_path = os.path.join(REPO_DIR, f"{repo_name}.git")
    if not os.path.exists(repo_path):
        return jsonify({"error": "Repository not found"}), 404
    
    # Receive packfile from the client
    packfile = request.data  # The packfile sent by the client
    packfile_path = f"{repo_name}.pack"
    with open(packfile_path, 'wb') as f:
        f.write(packfile)
    
    # Calculate the commit hash (simplified, can be fetched from the git packfile itself)
    commit_hash = hashlib.sha1(packfile).hexdigest()

    print(f"Commit hash: {commit_hash}")

    # Upload packfile to Arweave, tag with RepoID and CommitHash
    # transaction_id = upload_packfile_to_arweave(packfile_path, repo_name, commit_hash)
    
    # Update repository state in Solana (simplified)
    # update_repo_state_in_solana(repo_name, commit_hash, transaction_id)

    # Return response
    return jsonify({"message": f"Push successful, stored packfile on Arweave with transaction ID: {transaction_id}"}), 200

@app.route("/repos/<repo_name>.git/git-upload-pack", methods=["POST"])
def receive_pull(repo_name):
    token = request.headers.get('Authorization')
    if not authenticate_user_via_solana(token):
        return jsonify({"error": "Unauthorized"}), 403
    
    # Query Solana for the repository's transaction ID (packfile state)
    commit_hash, transaction_id = solana.get_repo_state(SOLANA_PROGRAM_ID, repo_name)
    if not transaction_id:
        return jsonify({"error": "No packfile found for this repo on Arweave"}), 404
    
    # Fetch the latest packfile for the repository from Arweave
    try:
        packfile = fetch_packfile_from_arweave(transaction_id)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    # Send the packfile back to the client
    return Response(packfile, content_type="application/x-git-pack-objects")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)