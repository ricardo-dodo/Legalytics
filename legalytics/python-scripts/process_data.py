import re
import json
import os
import sys
from dotenv import load_dotenv
from pandas import json_normalize
from collections import Counter
import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from opensearchpy import OpenSearch
import sys
from nltk.tokenize import word_tokenize
from Sastrawi.StopWordRemover.StopWordRemoverFactory import StopWordRemoverFactory
import string
from openai import OpenAI


# Membuat stopword remover menggunakan Sastrawi
factory = StopWordRemoverFactory()
stopword_remover = factory.create_stop_word_remover()

# Load environment variables from .env file
load_dotenv()

# OpenSearch configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENSEARCH_HOST = os.getenv("OPENSEARCH_HOST")
OPENSEARCH_PORT = int(os.getenv("OPENSEARCH_PORT"))
OPENSEARCH_USERNAME = os.getenv("OPENSEARCH_USERNAME")
OPENSEARCH_PASSWORD = os.getenv("OPENSEARCH_PASSWORD")

# Model configuration
MODEL_NAME = "indobenchmark/indobert-base-p1"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForTokenClassification.from_pretrained(MODEL_NAME)
ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer)
client = OpenAI()

def generate_gpt3_insight(text, record):

    prompt = f"Berdasarkan konteks '{text}' dan detail spesifik '{record}', berikan insight yang singkat, padat, dan bermakna."

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Anda adalah asisten yang ahli dalam menghasilkan insight yang bermakna dari konteks dan detail yang diberikan. Berikan insight dalam satu atau dua kalimat saja."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=50,
            top_p=1.0,
            frequency_penalty=0,
            presence_penalty=0
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating insight: {e}")
        return "Terjadi kesalahan dalam menghasilkan insight."


def retrieve_document(document_id):
    """
    Retrieve document from OpenSearch.
    """
    client = OpenSearch(
        hosts=[{"host": OPENSEARCH_HOST, "port": OPENSEARCH_PORT}],
        http_auth=(OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD),
        use_ssl=True,
        verify_certs=False,
        ssl_assert_hostname=False,
        ssl_show_warn=False,
    )

    try:
        response = client.get(index="law_analyzer_new4", id=document_id)
        data = response["_source"]
        flat_data = json_normalize(
            data,
            record_path=["Blocks"],
            meta=[
                "PeraturanId",
                "Nomor",
                "Slug",
                "Judul",
                "No",
                "Tahun",
                "Bentuk",
                "Status",
                "Bidang",
                "Source",
                "PeraturanGoId",
                "TanggalPenetapan",
                "TanggalPengundangan",
            ],
        )
        flat_data = flat_data.drop(columns=["chunks"])
        return flat_data
    except Exception as e:
        print(f"Error retrieving document: {str(e)}", file=sys.stderr)
        return None

def extract_prohibitions(text, record):
    prompt = f"""
Berdasarkan konteks berikut:
'{text}'

Temukan semua perintah atau larangan yang terdapat dalam teks di atas. Kembalikan hasilnya dalam format JSON array of objects, di mana setiap object memiliki satu key yaitu 'text' yang berisi satu perintah atau larangan yang ditemukan.

Contoh format respons yang diharapkan:
[
    {{
        "text": "Perintah atau larangan 1"
    }},
    {{
        "text": "Perintah atau larangan 2"
    }}
]

Pastikan respons Anda memenuhi kriteria berikut:
1. Respons harus berupa JSON array yang valid, tanpa teks tambahan, penanda blok kode, atau pemformatan lainnya.
2. Setiap perintah atau larangan harus diwakili oleh satu object dalam array.
3. Setiap object harus memiliki tepat satu key yaitu 'text'.
4. Nilai dari key 'text' harus berisi perintah atau larangan yang diekstrak dari teks, tanpa tambahan informasi lainnya.
5. Jika tidak ditemukan perintah atau larangan, kembalikan array kosong [].

Respons Anda harus berupa JSON array saja, tanpa teks tambahan sebelum atau sesudah JSON.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Anda adalah asisten yang ahli dalam mengekstrak perintah atau larangan dari teks hukum."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=150,
            top_p=1.0,
            frequency_penalty=0,
            presence_penalty=0
        )
        prohibitions_json = response.choices[0].message.content.strip()

        # Membersihkan respons dari penanda blok kode dan pemformatan lainnya
        prohibitions_json = prohibitions_json.replace("```json", "").replace("```", "").strip()
        prohibitions_json = re.sub(r"\s+", " ", prohibitions_json)

        try:
            prohibitions = json.loads(prohibitions_json)
            return prohibitions
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            print(f"Response from ChatGPT: {prohibitions_json}")
            return []
    except Exception as e:
        print(f"Error extracting prohibitions: {e}")
        return []


def extract_dates(text):
    """
    Extract dates from text.
    """
    date_pattern = re.compile(
        r"\b(?:\d{1,2}\s(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s\d{4})\b"
    )
    return date_pattern.findall(text)


def extract_money(text):
    """
    Extract monetary values from text.
    """
    patterns = {
        "RP": re.compile(
            r"\b(?:\(?Rp\s*(?:\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\)?|\(?Rp\s*(?:nol|nol,? nol)\)?\s*\(?Rupiah\)?)\b",
            re.IGNORECASE,
        ),
        "USD": re.compile(r"(USD)([+-]?[0-9]{1,3}(,?[0-9]{3})*)(\.[0-9]{1,4})"),
        "EUR": re.compile(r"(€|EUR)([+-]?[0-9]{1,3}(,?[0-9]{3})*)(\.[0-9]{1,4})"),
        "GBP": re.compile(r"(£|GBP)([+-]?[0-9]{1,3}(,?[0-9]{3})*)(\.[0-9]{1,4})"),
        "JPY": re.compile(r"(¥|JPY)([+-]?[0-9]{1,3}(,?[0-9]{3})*)(\.?[0-9]{0,4})"),
    }

    matches = []
    for currency, pattern in patterns.items():
        found_matches = pattern.findall(text)
        matches.extend(["".join(match) for match in found_matches])

    word_to_number = {
        "satu": "1",
        "dua": "2",
        "tiga": "3",
        "empat": "4",
        "lima": "5",
        "enam": "6",
        "tujuh": "7",
        "delapan": "8",
        "sembilan": "9",
        "nol": "0",
        "ribu": "000",
        "juta": "000000",
        "miliar": "000000000",
        "triliun": "000000000000",
    }

    numerical_matches = []
    for match in matches:
        if "Rp" in match:
            for word, value in word_to_number.items():
                match = match.replace(word, value)
        numerical_matches.append(match)

    return numerical_matches


def apply_ner(text):
    """
    Apply named entity recognition.
    """
    if not text.strip():
        return []

    split_texts = [text[i : i + 512] for i in range(0, len(text), 512)]
    ner_results = []

    for split_text in split_texts:
        results = ner_pipeline(split_text)
        ner_results.extend(results)

    return ner_results


def process_record(record):
    """
    Memproses setiap record untuk mengekstrak nilai uang, tanggal, dan larangan,
    serta menghasilkan insight untuk masing-masing berdasarkan konteks dari flat_data.

    Args:
        record (dict): Satu record dokumen dari flat_data.

    Returns:
        dict: Record yang telah diproses beserta insight-nya.
    """
    content = record["content"]

    money = extract_money(content)
    dates = extract_dates(content)
    prohibitions = extract_prohibitions(content, record)

    money_insights = [{"value": m, "insight": generate_gpt3_insight(m, record)} for m in money]
    date_insights = [{"date": d, "insight": generate_gpt3_insight(d, record)} for d in dates]
    prohibition_insights = [{"text": p["text"], "insight": generate_gpt3_insight(p["text"], record)} for p in prohibitions]

    return {
        "content": content,
        "money_insights": money_insights,
        "date_insights": date_insights,
        "prohibition_insights": prohibition_insights
    }

def process_data(document_id):
    """
    Memproses data untuk document ID yang diberikan.
    """
    flat_data = retrieve_document(document_id)

    if flat_data is None or flat_data.empty:
        print("No data retrieved or data is empty.", file=sys.stderr)
        return {}

    processed_records = []
    for _, row in flat_data.iterrows():
        result_dict = process_record(row)
        processed_records.append(result_dict)

    # Menggabungkan semua konten yang di-tokenize
    content_words = [word for record in processed_records for word in word_tokenize(record["content"].lower())]

    # Menghapus angka dan tanda baca
    content_text = " ".join(content_words)
    content_text = re.sub(r'\d+', '', content_text)  # Menghapus angka
    content_text = content_text.translate(str.maketrans("", "", string.punctuation))  # Menghapus tanda baca

    # Menghapus stopwords dengan Sastrawi
    filtered_text = stopword_remover.remove(content_text)

    # Tokenize lagi setelah membersihkan teks
    filtered_words = word_tokenize(filtered_text)

    word_counts = Counter(filtered_words)
    word_counts_30 = word_counts.most_common(50)
    word_cloud_data = [{"text": word, "value": count} for word, count in word_counts_30]

    money_data = [
        {"value": money["value"], "insight": money["insight"]} 
        for record in processed_records 
        for money in record["money_insights"]
    ]
    prohibition_data = [
        {"text": prohibition["text"], "insight": prohibition["insight"]}
        for record in processed_records
        for prohibition in record["prohibition_insights"]
    ]
    date_data = [
        {"date": date["date"], "insight": date["insight"]}
        for record in processed_records
        for date in record["date_insights"]
    ]

    result = {
        "wordCloud": word_cloud_data,
        "tables": {
            "money": money_data,
            "prohibitions": prohibition_data,
            "dates": date_data,
        },
    }

    # Convert the result dictionary to JSON
    result_json = json.dumps(result)
    return result_json


if __name__ == "__main__":
    document_id = sys.argv[1]  # Get document ID from command line argument
    result = process_data(document_id)
    print(result, end='')





