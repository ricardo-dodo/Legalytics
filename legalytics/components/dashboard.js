
// components/dashboard.js
import React, { useEffect } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import styles from '../styles/Dashboard.module.css';

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
            .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
            .text(d => d.text)
            // Adding simple interaction
            .on('mouseover', function() { d3.select(this).style('fill', 'orange'); })
            .on('mouseout', function(_, i) { d3.select(this).style('fill', d3.schemeCategory10[i % 10]); });
    };

    const renderTableRows = (data, type) => {
        return data.length === 0
          ? <tr><td colSpan="2">No data available</td></tr>
          : data.map((item, index) => (
              <tr key={index}>
                {/* Use the 'type' parameter to conditionally render data */}
                <td>{type === 'dates' ? item.date : (type === 'money' ? item.value : item.text)}</td>
                <td>{item.insight || 'No insight available'}</td>
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
            {/* Iterating over 'money', 'prohibitions', 'dates' to render tables */}
            {['money', 'prohibitions', 'dates'].map((key) => (
            <div key={key} className={styles.tableContainer}>
                <h2 className={styles.tableTitle}>{key.charAt(0).toUpperCase() + key.slice(1)}</h2>
                <table className={styles.table}>
                <thead>
                    <tr>
                    <th>{key.charAt(0).toUpperCase() + key.slice(1)}</th>
                    <th>Insight</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Ensure 'key' is passed as 'type' to 'renderTableRows' */}
                    {renderTableRows(processedData.tables[key], key)}
                </tbody>
                </table>
            </div>
            ))}
        </div>
    </div>
);
};

export default Dashboard;
