import { useEffect, useState } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import styles from '../styles/Home.module.css'; // Ensure this import is correct

export default function Dashboard() {
  const [processedData, setProcessedData] = useState({ wordCloud: [], tables: { money: [], prohibitions: [], dates: [] } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data from the API
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

  // Render the word cloud when processedData.wordCloud is updated
  useEffect(() => {
    if (processedData.wordCloud.length > 0) {
      renderWordCloud(processedData.wordCloud);
    }
  }, [processedData.wordCloud]);

  // Function to draw the word cloud using D3
  const renderWordCloud = (wordsData) => {
    const width = 800;
    const height = 400;

    // Prepare the svg area
    d3.select('#word-cloud').selectAll("*").remove(); // Clear previous
    const svg = d3.select('#word-cloud')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Configure the cloud layout
    cloud()
      .size([width, height])
      .words(wordsData.map(d => ({ ...d, size: d.value * 5 }))) // Customize this mapping as necessary
      .padding(5)
      .rotate(() => 0)
      .fontSize(d => d.size)
      .on('end', (words) => draw(words, svg))
      .start();
  };

  // Function to actually draw the word cloud
  function draw(words, svg) {
    svg.selectAll('text')
      .data(words)
      .enter().append('text')
      .style('font-size', d => `${d.size}px`)
      .style('fill', (_, i) => d3.schemeCategory10[i % 10])
      .attr('text-anchor', 'middle')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .text(d => d.text);
  }

  // Function to render table rows
  const renderTableRows = (data) => {
    return data.length === 0
      ? <tr><td colSpan="2">No data available</td></tr>
      : data.map((item, index) => (
        <tr key={index}>
          <td>{item.text || item.date || item.value || 'N/A'}</td>
          <td>{item.value || 'Details (N/A)'}</td>
        </tr>));
  };

  if (loading) return <div className={styles.notice}>Loading...</div>;
  if (error) return <div className={styles.notice}>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Word Cloud</h2>
        <div className={styles.svgContainer}>
          <svg id="word-cloud"></svg>
        </div>
      </div>

      {/* Render tables for money, prohibitions, and dates */}
      {['money', 'prohibitions', 'dates'].map((key) => (
        <div key={key} className={styles.section}>
          <h2 className={styles.sectionTitle}>{key.charAt(0).toUpperCase() + key.slice(1)} Table</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Text/Value</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>{renderTableRows(processedData.tables[key] || [])}</tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
