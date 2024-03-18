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
  const pythonProcess = spawn('python3', [pythonScriptPath, document_id]);

  let scriptOutput = '';
  let scriptError = '';

  pythonProcess.stdout.on('data', (data) => {
    scriptOutput += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    scriptError += data.toString();
  });

  pythonProcess.on('error', (error) => {
    console.error('Failed to start subprocess:', error);
    return res.status(500).json({ error: 'Failed to start Python script', details: error.message });
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      console.error(`Error output: ${scriptError}`);
      return res.status(500).json({ error: 'Python script execution failed', details: scriptError });
    }

    try {
      const processedData = JSON.parse(scriptOutput);
      if (processedData.error) {
        console.error('Error from Python script:', processedData.error);
        return res.status(500).json({ error: 'Error from Python script', details: processedData.error });
      }
      res.status(200).json(processedData);
    } catch (parseError) {
      console.error('Error parsing JSON output:', parseError);
      console.error('Raw output:', scriptOutput);
      return res.status(500).json({ error: 'Error parsing Python script output', details: parseError.message });
    }
  });
}
