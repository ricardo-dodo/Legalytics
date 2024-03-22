import re
import json
import os
import sys
from dotenv import load_dotenv
from pandas import json_normalize
from collections import Counter
from nltk.corpus import stopwords
import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
from opensearchpy import OpenSearch
import sys
from nltk.tokenize import word_tokenize

# Load environment variables from .env file
load_dotenv()

# OpenSearch configuration
OPENSEARCH_HOST = os.getenv("OPENSEARCH_HOST")
OPENSEARCH_PORT = int(os.getenv("OPENSEARCH_PORT"))
OPENSEARCH_USERNAME = os.getenv("OPENSEARCH_USERNAME")
OPENSEARCH_PASSWORD = os.getenv("OPENSEARCH_PASSWORD")

# Model configuration
MODEL_NAME = "indobenchmark/indobert-base-p1"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForTokenClassification.from_pretrained(MODEL_NAME)
ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer)


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


def extract_prohibitions(text):
    """
    Extract prohibition statements from text.
    """
    prohibition_pattern = re.compile(
        r"(?:dilarang|Dilarang):\s*([a-z](?:(?!(?:dilarang|Dilarang):).)*)\.",
        re.IGNORECASE | re.DOTALL,
    )
    prohibitions = prohibition_pattern.findall(text)
    cleaned_prohibitions = [
        re.sub(r"\n", " ", prohibition).strip() for prohibition in prohibitions
    ]
    return cleaned_prohibitions


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
    Process individual record.
    """
    content = record["content"]

    if not content:
        return {
            "content": content,
            "money": [],
            "dates": [],
            "prohibitions": [],
            "named_entities": [],
        }

    result_dict = {
        "content": content,
        "money": extract_money(content),
        "dates": extract_dates(content),
        "prohibitions": extract_prohibitions(content),
    }
    ner_results = apply_ner(content)

    return result_dict

# Load stopwords from file
stopword_file = "tala-stopwords-indonesia.txt"
with open(stopword_file, "r") as f:
    stopword_list = [line.strip().split()[0] for line in f]


def process_data(document_id):
    """
    Process data for a given document ID.
    """
    flat_data = retrieve_document(document_id)

    if flat_data is None or flat_data.empty:
        print("No data retrieved or data is empty.", file=sys.stderr)
        return {}

    flat_data = flat_data.dropna(subset=["content"])

    processed_records = []
    for _, row in flat_data.iterrows():
        result_dict = process_record(row)
        processed_records.append(result_dict)

    content_words = [
        word for record in processed_records for word in word_tokenize(record["content"].lower())
    ]
    filtered_words = [word for word in content_words if word not in stopword_list]

    word_counts = Counter(filtered_words)
    word_counts_30 = word_counts.most_common(30)
    word_cloud_data = [{"text": word, "value": count} for word, count in word_counts_30]

    money_data = [
        {"value": money} for record in processed_records for money in record["money"]
    ]
    prohibition_data = [
        {"text": prohibition}
        for record in processed_records
        for prohibition in record["prohibitions"]
    ]
    date_data = [
        {"date": date} for record in processed_records for date in record["dates"]
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
    print(result)
