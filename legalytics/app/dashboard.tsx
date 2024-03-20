import { useEffect, useState } from 'react';
import axios from 'axios';
import { WordCloud } from 'react-wordcloud';
import styles from '../styles/Home.module.css';

interface ProcessedData {
  wordCloud: { text: string; value: number }[];
  tables: {
    money: { value: string }[];
    prohibitions: { text: string }[];
    dates: { date: string }[];
  };
}

const options = {
  rotations: 2,
  rotationAngles: [-90, 0],
};

export default function Dashboard() {
  const [processedData, setProcessedData] = useState<ProcessedData>({
    wordCloud: [],
    tables: { money: [], prohibitions: [], dates: [] },
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('Fetching data from API...'); // Log when the fetch request is made
    axios
      .get<ProcessedData>('/api/process-data?document_id=66-pmk.02-2013')
      .then(response => {
        console.log('Received response from API:', response.data); // Log the received data
        setProcessedData(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data. Please try again.');
        setLoading(false);
      });
  }, []);

  const renderTableRows = (data: { text?: string; value?: string; date?: string }[]) => {
    if (!data || data.length === 0) {
      return <tr><td colSpan={2}>No data available</td></tr>;
    }

    return data.map((item, index) => (
      <tr key={index}>
        <td>{item.text || item.date || item.value || 'N/A'}</td>
        <td>{item.value || 'Details (N/A)'}</td>
      </tr>
    ));
  };

  const renderWordCloud = () => {
    if (!processedData.wordCloud || processedData.wordCloud.length === 0) {
      return <div>No word cloud data available</div>;
    }
    return <WordCloud words={processedData.wordCloud} options={options} />;
  };

  if (loading) return <div className={styles.notice}>Loading...</div>;
  if (error) return <div className={styles.notice}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Word Cloud</h2>
        {renderWordCloud()}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Money Table</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Value</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {renderTableRows(processedData.tables?.money || [])}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Prohibition Table</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Text</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {renderTableRows(processedData.tables?.prohibitions || [])}
          </tbody>
        </table>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Date Table</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {renderTableRows(processedData.tables?.dates || [])}
          </tbody>
        </table>
      </div>
    </div>
  );
}
