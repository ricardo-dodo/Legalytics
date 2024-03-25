// components/dashboard.js
import React, { useEffect } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import styles from '../styles/Dashboard.module.css'; // Update import for modern styles

const Dashboard = ({ processedData }) => {
  useEffect(() => {
    if (processedData.wordCloud && processedData.wordCloud.length > 0) {
      renderWordCloud(processedData.wordCloud);
    }
  }, [processedData.wordCloud]);

  const renderWordCloud = (wordsData) => {
    const width = 800;
    const height = 400;

    d3.select('#word-cloud').selectAll("*").remove();

    const svg = d3.select('#word-cloud')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    cloud()
      .size([width, height])
      .words(wordsData.map(d => ({ ...d, size: d.value * 5 })))
      .padding(5)
      .rotate(() => 0)
      .fontSize(d => d.size)
      .on('end', (words) => draw(words, svg))
      .start();
  };

  const draw = (words, svg) => {
    svg.selectAll('text')
      .data(words)
      .enter().append('text')
      .style('font-size', d => `${d.size}px`)
      .style('fill', (_, i) => d3.schemeCategory10[i % 10])
      .attr('text-anchor', 'middle')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .text(d => d.text);
  };

  const renderTableRows = (data) => {
    return data.length === 0
      ? <tr><td colSpan="2">No data available</td></tr>
      : data.map((item, index) => (
        <tr key={index}>
          <td>{item.text || item.date || item.value || 'N/A'}</td>
          <td>{item.value || 'Details (N/A)'}</td>
        </tr>
      ));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.wordCloudSection}>
        <div className={styles.wordCloudContainer}>
          <svg id="word-cloud" className={styles.wordCloud}></svg>
        </div>
      </div>

      <div className={styles.tablesSection}>
        {['money', 'prohibitions', 'dates'].map((key) => (
          <div key={key} className={styles.tableContainer}>
            <h2 className={styles.tableTitle}>{key.charAt(0).toUpperCase() + key.slice(1)} Table</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Text/Value</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>{renderTableRows(processedData.tables && processedData.tables[key] ? processedData.tables[key] : [])}</tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;



