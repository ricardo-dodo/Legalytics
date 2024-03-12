# For data manipulation
import re
import json
import pandas as pd
from pandas import json_normalize

# For NLP
import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline

with open('data.json', 'r') as f:
    data = json.load(f)

flat_data = json_normalize(data, record_path=['data']) # flatten the data

# Set up the IndoBERT NER model
model_name = "indobenchmark/indobert-base-p1"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForTokenClassification.from_pretrained(model_name)
ner_pipeline = pipeline("ner", model="cahya/bert-base-indonesian-522M", tokenizer="cahya/bert-base-indonesian-522M")

def extract_prohibitions(text):
    """
    Extracts the list of prohibitions from the given text.

    Args:
        text (str): The text from which to extract the prohibitions.

    Returns:
        list: A list of prohibitions extracted from the text.
    """
    prohibition_pattern = re.compile(r'\bDilarang:\s*([^;]+)', re.IGNORECASE)
    prohibitions = prohibition_pattern.findall(text)
    return prohibitions

def extract_dates(text):
    """
    Extracts dates from the given text.

    Args:
        text (str): The text from which dates need to be extracted.

    Returns:
        list: A list of dates extracted from the text.
    """
    date_pattern = re.compile(r'\b(?:\d{1,2}\s(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s\d{4})\b')
    return date_pattern.findall(text)

def extract_money(text):
    """
    Extracts money or monetary keywords from the given text.

    Args:
        text (str): The text from which to extract money or monetary keywords.

    Returns:
        list: A list of money or monetary keywords extracted from the text.
    """
    money_pattern = re.compile(r'\b(?:\(?Rp\s*(?:\d{1,3}(?:[,.]\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\)?|\(?Rp\s*(?:nol|nol,? nol)\)?\s*\(?Rupiah\)?)\b', re.IGNORECASE)

    matches = money_pattern.findall(text)

    word_to_number = {
        'satu': '1', 'dua': '2', 'tiga': '3', 'empat': '4', 'lima': '5',
        'enam': '6', 'tujuh': '7', 'delapan': '8', 'sembilan': '9', 'nol': '0',
        'ribu': '000', 'juta': '000000', 'miliar': '000000000', 'triliun': '000000000000'
    }

    numerical_matches = []
    for match in matches:
        for word, value in word_to_number.items():
            match = match.replace(word, value)
        numerical_matches.append(match)

    return numerical_matches

def apply_ner(text, ner_pipeline, max_length=512):
    """Apply Named Entity Recognition (NER) using the transformers pipeline on the given text.
    This version supports processing of text longer than 512 tokens by splitting the text into
    manageable parts and then combining the results.

    Args:
        text (str): The input text to perform NER on.
        ner_pipeline (pipeline): The NER pipeline for prediction.
        max_length (int): Maximum length of tokens to process in a single call to the NER pipeline.

    Returns:
        list: A list of predicted named entities in the text.
    """
    if not text.strip():  # Check if text is empty
        return []

    # Initialize variables
    split_texts = [text[i:i+max_length] for i in range(0, len(text), max_length)]
    ner_results = []

    # Process each split text
    for split_text in split_texts:
        results = ner_pipeline(split_text)
        ner_results.extend(results)

    return ner_results


flat_data = flat_data.dropna(subset=['content'])

def process_record(record, ner_pipeline):
    """Process a record by extracting relevant information.

    Args:
        record (pd.Series): A pandas Series representing a record with 'content' as one of the keys.
        ner_pipeline: The NER pipeline object used for Named Entity Recognition.

    Returns:
        dict: A dictionary containing the processed record with the following keys:
            - 'content': The original content of the record.
            - 'money': A list of extracted money values.
            - 'dates': A list of extracted dates.
            - 'prohibitions': A list of extracted prohibitions.
            - 'named_entities': A list of named entities recognized by NER.
    """
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

processed_records = [process_record(row, ner_pipeline) for index, row in flat_data.iterrows()]
processed_df = pd.DataFrame(processed_records)

for col in processed_df.columns:
    processed_df[col] = processed_df[col].apply(lambda x: ', '.join(x) if isinstance(x, list) else x)
    
for col in ['money', 'dates', 'prohibitions']:
    print(f'Unique values in {col} column:')
    print(processed_df[col].unique())
    print()