import re
import json
import pandas as pd
from pandas import json_normalize

import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

from opensearchpy import OpenSearch

def retrieve_document(document_id):
    # Set up OpenSearch connection with environment variables
    client = OpenSearch(
        hosts=[{'host': ('62.72.7.91'), 'port': (('9200'))}],
        http_auth=(('admin_jdih'), ('JDIHjuara6065')),
        use_ssl=True,
        verify_certs=False,
        ssl_assert_hostname=False,
        ssl_show_warn=False
    )

    # Retrieve the document by ID
    response = client.get(index="law_analyzer_new4", id=document_id)

    # Extract the document source
    data = response['_source']

    # Normalize the nested data
    flat_data = json_normalize(data, record_path=['Blocks'], 
                               meta=['PeraturanId', 'Nomor', 'Slug', 'Judul', 'No', 'Tahun', 'Bentuk', 'Status', 'Bidang', 'Source', 'PeraturanGoId', 'TanggalPenetapan', 'TanggalPengundangan'])

    flat_data = flat_data.drop(columns=['chunks'])
    return flat_data

def extract_prohibitions(text):
    prohibition_pattern = re.compile(r'(?:dilarang|Dilarang):\s*([a-z](?:(?!(?:dilarang|Dilarang):).)*)\.', re.IGNORECASE | re.DOTALL)
    prohibitions = prohibition_pattern.findall(text)
    cleaned_prohibitions = []
    for prohibition in prohibitions:
        cleaned_prohibition = re.sub(r'\n', ' ', prohibition).strip()
        cleaned_prohibitions.append(cleaned_prohibition)
    return cleaned_prohibitions

def extract_dates(text):
    date_pattern = re.compile(r'\b(?:\d{1,2}\s(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s\d{4})\b')
    return date_pattern.findall(text)

def extract_money(text):
    patterns = {
        'RP': re.compile(r'\b(?:\(?Rp\s*(?:\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\)?|\(?Rp\s*(?:nol|nol,? nol)\)?\s*\(?Rupiah\)?)\b', re.IGNORECASE),
        'USD': re.compile(r"(USD)([+-]?[0-9]{1,3}(,?[0-9]{3})*)(\.[0-9]{1,4})"),
        'EUR': re.compile(r"(€|EUR)([+-]?[0-9]{1,3}(,?[0-9]{3})*)(\.[0-9]{1,4})"),
        'GBP': re.compile(r"(£|GBP)([+-]?[0-9]{1,3}(,?[0-9]{3})*)(\.[0-9]{1,4})"),
        'JPY': re.compile(r"(¥|JPY)([+-]?[0-9]{1,3}(,?[0-9]{3})*)(\.?[0-9]{0,4})"),
    }

    matches = []
    for currency, pattern in patterns.items():
        found_matches = pattern.findall(text)
        for match in found_matches:
            matches.append(''.join(match))

    word_to_number = {
        'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5',
        'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9', 'nol': '0',
        'ribu': '000', 'juta': '000000', 'miliar': '000000000', 'triliun': '000000000000'
    }

    numerical_matches = []
    for match in matches:
        for word, value in word_to_number.items():
            if 'Rp' in match:
                match = match.replace(word, value)
        numerical_matches.append(match)

    return numerical_matches

def apply_ner(text, ner_pipeline, max_length=512):
    if not text.strip():
        return []

    split_texts = [text[i:i+max_length] for i in range(0, len(text), max_length)]
    ner_results = []

    for split_text in split_texts:
        results = ner_pipeline(split_text)
        ner_results.extend(results)

    return ner_results

def process_record(record, ner_pipeline):
    content = record['content']

    if not content:
        return {
            'content': content,
            'money': [],
            'dates': [],
            'prohibitions': [],
            'named_entities': []
        }

    result_dict = {
        'content': content,
        'money': extract_money(content),
        'dates': extract_dates(content),
        'prohibitions': extract_prohibitions(content),
    }
    ner_results = apply_ner(content, ner_pipeline)

    return result_dict

def process_data(document_id):
    # Set up the IndoBERT NER model
    model_name = "indobenchmark/indobert-base-p1"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForTokenClassification.from_pretrained(model_name)
    ner_pipeline = pipeline("ner", model="cahya/bert-base-indonesian-522M", tokenizer="cahya/bert-base-indonesian-522M")

    flat_data = retrieve_document(document_id)
    flat_data = flat_data.dropna(subset=['content'])

    processed_records = [process_record(row, ner_pipeline) for index, row in flat_data.iterrows()]
    processed_df = pd.DataFrame(processed_records)

    for col in processed_df.columns:
        processed_df[col] = processed_df[col].apply(lambda x: ', '.join(x) if isinstance(x, list) else x)

    result = processed_df.to_json(orient='records')
    return result
