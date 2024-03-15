import { useEffect, useState } from 'react';
import axios from 'axios';
import styles from '../styles/Home.module.css'; // Ensure this file exists and is properly set up

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const res = await axios.get('/api/process-data?document_id=123'); // Example query
      setData(res.data);
    };
    fetchData();
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      {/* Render your data here */}
    </div>
  );
}
