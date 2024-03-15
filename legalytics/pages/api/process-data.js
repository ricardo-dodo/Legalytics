  // pages/api/process-data.js
  import { PythonShell } from 'python-shell';

  export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { document_id } = req.query;

  if (!document_id) {
    return res.status(400).json({ error: 'Missing document_id parameter' });
  }

  const options = {
    mode: 'text',
    pythonOptions: ['-u'], // get print results in real-time
    scriptPath: './python-scripts',
    args: [document_id],
  };

  try {
    const result = await new Promise((resolve, reject) => {
      PythonShell.run('process_data.py', options, (err, results) => {
        if (err) {
          console.error(err);
          return reject(new Error('Error processing data'));
        }

        // Assuming the Python script outputs valid JSON
        try {
          const parsedResults = JSON.parse(results[0]);
          resolve(parsedResults);
        } catch (parseErr) {
          console.error(parseErr);
          reject(new Error('Error parsing Python script output'));
        }
      });
    });

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}

