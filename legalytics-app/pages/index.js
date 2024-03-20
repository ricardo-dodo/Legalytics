// pages/index.js
import React from 'react';
import DocumentProcessor from '../components/DocumentProcessor';
import WordCloud from '../components/WordCloud';

const Home = () => {
  // Placeholder document ID, replace with actual IDs from your application
  const documentId = "66-pmk.02-2013";

  return (
    <div>
      <h1>Document Data Dashboard</h1>
      <WordCloud documentId={documentId} />
      <DocumentProcessor documentId={documentId} />
    </div>
  );
};

export default Home;
