// components/dashboard.js
import React, { useEffect, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import PropTypes from 'prop-types';
import styles from '../styles/Dashboard.module.css';

const Dashboard = ({ processedData }) => {
    const [currentPage, setCurrentPage] = useState({ money: 1, prohibitions: 1, dates: 1 });
    const itemsPerPage = 2; // Adjust as needed

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
            .on('mouseover', function () { d3.select(this).style('fill', 'orange'); })
            .on('mouseout', function (_, i) { d3.select(this).style('fill', d3.schemeCategory10[i % 10]); });
    };

    const renderTableRows = (data, type) => {
        // Adjusting data slicing for pagination
        const indexOfLastItem = currentPage[type] * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);

        return currentItems.length === 0
            ? <tr><td colSpan="2">No data available</td></tr>
            : currentItems.map((item) => {
                let content;
                if (type === 'dates') {
                    content = item.date;
                } else if (type === 'money') {
                    content = item.value;
                } else {
                    content = item.text;
                }
                return (
                    <tr key={item.id}>
                        <td>{content}</td>
                        <td>{item.insight || 'No insight available'}</td>
                    </tr>
                );
            });
    };

    const renderPaginationControls = (type) => {
        const totalItems = processedData.tables[type].length;
        const pageCount = totalItems > 0 ? Math.ceil(totalItems / itemsPerPage) : 1;

        const isPrevDisabled = currentPage[type] === 1;
        const isNextDisabled = currentPage[type] === pageCount || totalItems === 0;

        return (
            <div>
                <button
                    className={`${styles.paginationButton} ${isPrevDisabled ? styles.disabledButton : ''}`}
                    onClick={() => setCurrentPage({ ...currentPage, [type]: currentPage[type] - 1 })}
                    disabled={isPrevDisabled}
                >
                    Previous
                </button>
                <span className={styles.pageCount}>{totalItems > 0 ? `${currentPage[type]} / ${pageCount}` : '1 / 1'}</span>
                <button
                    className={`${styles.paginationButton} ${isNextDisabled ? styles.disabledButton : ''}`}
                    onClick={() => setCurrentPage({ ...currentPage, [type]: currentPage[type] + 1 })}
                    disabled={isNextDisabled}
                >
                    Next
                </button>
            </div>
        );
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
                        <h2 className={styles.tableTitle}>{key.charAt(0).toUpperCase() + key.slice(1)}</h2>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>{key.charAt(0).toUpperCase() + key.slice(1)}</th>
                                    <th>Insight</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renderTableRows(processedData.tables[key], key)}
                            </tbody>
                        </table>
                        {renderPaginationControls(key)}
                    </div>
                ))}
            </div>
        </div>
    );
};

Dashboard.propTypes = {
    processedData: PropTypes.shape({
        wordCloud: PropTypes.array,
        tables: PropTypes.shape({
            money: PropTypes.array,
            prohibitions: PropTypes.array,
            dates: PropTypes.array,
        }),
    }),
};

export default Dashboard;
