import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTable } from 'react-table';

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

const Dashboard = () => {
  const [processedData, setProcessedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const documentId = '66-pmk.02-2013'; // Replace with your actual document ID or retrieve it dynamically
        const response = await axios.get(`/api/process-data?document_id=${documentId}`);
        setProcessedData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to fetch data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  // Define columns for DataTables
  const moneyColumns = [{ Header: 'Money', accessor: 'value' }];
  const prohibitionColumns = [{ Header: 'Prohibition', accessor: 'text' }];
  const dateColumns = [{ Header: 'Date', accessor: 'date' }];

  return (
    <div>
      <h1>Dashboard</h1>
      {processedData && (
        <>
          <div>
            <h2>Word Frequencies</h2>
            <ul>
              {processedData.wordCloud.map(wordItem => (
                <li key={wordItem.text}>
                  {wordItem.text}: {wordItem.value}
                </li>
              ))}
            </ul>
          </div>
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
};

export default Dashboard;
