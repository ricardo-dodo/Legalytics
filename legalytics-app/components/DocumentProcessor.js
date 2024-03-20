// components/DocumentProcessor.js
import axios from 'axios';
import React, { useState, useEffect } from 'react';

const DocumentProcessor = ({ documentId }) => {
  const [data, setData] = useState({ wordCloud: [], tables: { money: [], prohibitions: [], dates: [] } });

  useEffect(() => {
    axios.post('http://127.0.0.1:5000/process_data', { document_id: documentId })
      .then(res => {
        setData(res.data);
      })
      .catch(err => {
        console.error("Error fetching data: ", err);
      });
  }, [documentId]);

  return (
    <div>
      <h2>Word Cloud</h2>
      {/* Placeholder for Word Cloud Visualization */}
      <h2>Prohibitions</h2>
      <ul>
        {data.tables.prohibitions.map((item, index) => <li key={index}>{item.text}</li>)}
      </ul>
      <h2>Dates</h2>
      <ul>
        {data.tables.dates.map((item, index) => <li key={index}>{item.date}</li>)}
      </ul>
      <h2>Money</h2>
      <ul>
        {data.tables.money.map((item, index) => <li key={index}>{item.value}</li>)}
      </ul>
    </div>
  );
};

export default DocumentProcessor;
