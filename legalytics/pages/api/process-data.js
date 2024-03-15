  // pages/api/process-data.js
  import { PythonShell } from 'python-shell';

  export default async function handler(req, res) {
    if (req.method === 'GET') {
      const { document_id } = req.query;
      // res.status(200).json({ document_id: document_id });
      // return

      if (!document_id) {
        res.status(400).json({ error: 'Missing document_id parameter' });
        return;
      }

      try {
        const options = {
          mode: 'text',
          pythonOptions: ['-u'], // get print results in real-time
          scriptPath: './python-scripts', // path to your Python script directory
          args: [document_id], // pass the document_id as an argument to the Python script
        };

        const result = await PythonShell.run('process_data.py', options, (err, results) => {
          if (err) {
            console.error(err);
            // res.status(500).json({ error: 'Error processing data' });
            return err;
          }

          // Parse the JSON string returned by the Python script
          const processedData = JSON.parse(results[0]);

          // res.status(200).json(processedData);
          return processedData
        });
        res.status(200).json(result);
        return
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error processing data' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  }
