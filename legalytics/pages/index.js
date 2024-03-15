import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTable } from 'react-table';
import styles from '../styles/Home.module.css'; // Ensure this file exists and is properly set up

function DataTable({ columns, data }) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data,
  });

  return (
    <table {...getTableProps()}>
      <thead>
        {headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th {...column.getHeaderProps()}>{column.render('Header')}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        {rows.map(row => {
          prepareRow(row);
          return (
            <tr {...row.getRowProps()}>
              {row.cells.map(cell => (
                <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function Dashboard() {
  const [processedData, setProcessedData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ensure this endpoint matches your API route for processing the document
        const response = await axios.get('/api/process-data?document_id=66-pmk.02-2013');
        setProcessedData(response.data);
      } catch (err) {
        setError('Failed to fetch data. Please try again.');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  // Define columns for DataTables for money, prohibitions, and dates
  const moneyColumns = [{ Header: 'Money', accessor: 'value' }];
  const prohibitionColumns = [{ Header: 'Prohibition', accessor: 'text' }];
  const dateColumns = [{ Header: 'Date', accessor: 'date' }];

  return (
    <div className={styles.container}>
      <h1>Processed Document Dashboard</h1>
      {processedData.wordCloud && (
        <div>
          <h2>Word Cloud</h2>
          <ReactWordcloud words={processedData.wordCloud} />
        </div>
      )}
      {processedData.tables && (
        <>
          <div>
            <h2>Money Table</h2>
            <DataTable columns={moneyColumns} data={processedData.tables.money} />
          </div>
          <div>
            <h2>Prohibition Table</h2>
            <DataTable columns={prohibitionColumns} data={processedData.tables.prohibitions} />
          </div>
          <div>
            <h2>Date Table</h2>
            <DataTable columns={dateColumns} data={processedData.tables.dates} />
          </div>
        </>
      )}
    </div>
  );
}
