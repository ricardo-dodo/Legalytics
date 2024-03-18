import { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../styles/Home.module.css'; // Ensure correct path

export default function Dashboard() {
    const [processedData, setProcessedData] = useState({ tables: { money: [], prohibitions: [], dates: [] } });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        axios.get('/api/process-data?document_id=66-pmk.02-2013')
            .then(response => {
                setProcessedData(response.data); // Assuming this matches the expected data structure
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching data:', err);
                setError('Failed to fetch data. Please try again.');
                setLoading(false);
            });
    }, []);
    const renderTableRows = (data) => {
      // Early return if no data is provided or if it's an empty array
      if (!data || data.length === 0) {
          return <tr><td colSpan="2">No data available</td></tr>;
      }
  
      // Iterate over the data and render rows accordingly
      return data.map((item, index) => (
          <tr key={index}>
              <td>{item.text || item.date || 'N/A'}</td>
              <td>{item.value || 'Details (N/A)'}</td>
          </tr>
      ));
    };

    if (loading) return <div className={styles.notice}>Loading...</div>;
    if (error) return <div className={styles.notice}>Error: {error}</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Dashboard</h1>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Money Table</h2>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Description/Date</th>
                            <th>Value</th>
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
                            <th>Prohibition Text</th>
                            <th>Details (N/A)</th>
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
                            <th>Relevant Date</th>
                            <th>Details (N/A)</th>
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
