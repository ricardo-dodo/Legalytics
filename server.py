from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse

import fitz  # PyMuPDF
from opensearchpy import OpenSearch
from dotenv import load_dotenv
import uuid

app = FastAPI()
load_dotenv()

opensearch_host = os.getenv("OPENSEARCH_HOST")
opensearch_port = int(os.getenv("OPENSEARCH_PORT"))
opensearch_username = os.getenv("OPENSEARCH_USERNAME")
opensearch_password = os.getenv("OPENSEARCH_PASSWORD")

# Koneksi ke OpenSearch
client = OpenSearch(
        hosts=[{'host': opensearch_host, 'port': opensearch_port}],
        http_auth=(opensearch_username, opensearch_password),
        use_ssl=True,
        verify_certs=False,
        ssl_assert_hostname=False,
        ssl_show_warn=False
    )

# Nama indeks OpenSearch
INDEX_NAME = "law_analyzer_new4"

@app.post("/upload-pdf/")
async def create_upload_file(file: UploadFile = File(...)):
    # Buka file PDF yang di-upload
    pdf_data = await file.read()

    # Simpan ke file sementara
    temp_pdf_filename = f"temp_{uuid.uuid4()}.pdf"
    with open(temp_pdf_filename, "wb") as pdf_file:
        pdf_file.write(pdf_data)

    # Menguraikan file PDF
    parsed_text = parse_pdf(temp_pdf_filename)

    # Hapus file sementara
    os.remove(temp_pdf_filename)

    # Simpan data ke OpenSearch dan dapatkan doc_id
    doc_id = index_document_in_opensearch(parsed_text)

    return JSONResponse(content={"document_id": doc_id}, status_code=200)

#fungsi parse pdf yang sudah fix 
def parse_pdf(filename):
    doc = fitz.open(filename)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def index_document_in_opensearch(document_text):
    document = {
        "content": document_text,
        # Tambahkan field tambahan sesuai kebutuhan
    }
    # Menyimpan document ke OpenSearch
    response = client.index(
        index=INDEX_NAME,
        body=document
    )
    return response["_id"]
