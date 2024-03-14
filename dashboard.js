import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Dashboard = ({ documentId }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`/process_data/${documentId}`);
        setData(JSON.parse(response.data));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [documentId]);

  return (
    <div>
      <h2>Hasil Pemrosesan Dokumen</h2>
      {data.map((item, index) => (
        <div key={index}>
          <p>{item.content}</p>
          <p>Uang: {item.money}</p>
          <p>Tanggal: {item.dates}</p>
          <p>Larangan: {item.prohibitions}</p>
        </div>
      ))}
    </div>
  );
};

export default Dashboard;
