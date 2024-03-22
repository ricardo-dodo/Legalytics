// pages/index.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from '../components/dashboard';
import styles from '../styles/Home.module.css';

const Index = () => {
  const [processedData, setProcessedData] = useState({ wordCloud: [], tables: { money: [], prohibitions: [], dates: [] } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('/api/process-data?document_id=66-pmk.02-2013')
      .then(response => {
        setProcessedData(response.data);
        setLoading(false);
      })
      .catch(error => {
        setError('Failed to fetch data. Please try again.');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className={styles.notice}>Loading...</div>;
  if (error) return <div className={styles.notice}>Error: {error}</div>;

  return (
    <Dashboard processedData={processedData} />
  );
};

export default Index;
