import { spawn } from 'child_process';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    console.error('Non-GET request made');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { document_id } = req.query;
  if (!document_id) {
    console.error('Missing document_id parameter');
    return res.status(400).json({ error: 'Missing document_id parameter' });
  }

  const pythonScriptPath = path.join(process.cwd(), 'python-scripts', 'process_data.py');
  const pythonProcess = spawn('python', [pythonScriptPath, document_id]);

  let scriptOutput = '';
  let scriptError = '';

  pythonProcess.stdout.on('data', (data) => {
    scriptOutput += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    scriptError += data.toString();
  });

  pythonProcess.on('error', (error) => {
    console.error('Failed to start subprocess.', error);
  });

  pythonProcess.on('close', (code) => {
    if (scriptError) console.error('Script error output:', scriptError);

    if (code !== 0) {
      console.error(`Script closed with code ${code}`);
      return res.status(500).json({ error: 'Error executing Python script', details: scriptError });
    }

    try {
      const processedData = JSON.parse(scriptOutput);
      res.status(200).json(processedData);
    } catch (parseError) {
      console.error('Error parsing processed data:', parseError, 'Raw Output:', scriptOutput);
      return res.status(500).json({ error: 'Error parsing processed data', rawOutput: scriptOutput });
    }
  });
}
