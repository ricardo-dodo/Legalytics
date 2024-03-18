import { spawn } from 'child_process';
import path from 'path';

export default function handler(req, res) {
  console.log('Received request:', req.method, req.query); // Log incoming request

  if (req.method !== 'GET') {
    console.error('Non-GET request made');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { document_id } = req.query;
  if (!document_id) {
    console.error('Missing document_id parameter');
    res.status(400).json({ error: 'Missing document_id parameter' });
    return;
  }

  const pythonScriptPath = path.join(process.cwd(), 'python-scripts', 'process_data.py');
  console.log('Python script path:', pythonScriptPath); // Log Python script path

  const pythonProcess = spawn('python3', [pythonScriptPath, document_id]);
  console.log('Python process spawned'); // Log when Python process is spawned

  let scriptOutput = '';
  let scriptError = '';

  pythonProcess.stdout.on('data', (data) => {
    console.log('Received data from Python script:', data.toString()); // Log data received from Python
    scriptOutput += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error('Received error from Python script:', data.toString()); // Log errors from Python
    scriptError += data.toString();
  });

  pythonProcess.on('error', (error) => {
    console.error('Failed to start subprocess:', error);
    res.status(500).json({ error: 'Failed to start Python script', details: error.message });
  });

  pythonProcess.on('close', (code) => {
    console.log('Python process exited with code:', code); // Log Python process exit code

    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      console.error(`Error output: ${scriptError}`);
      res.status(500).json({ error: 'Python script execution failed', details: scriptError });
      return;
    }

    try {
      console.log('Script output:', scriptOutput); // Log the raw output from Python
      const processedData = JSON.parse(scriptOutput);
      if (processedData.error) {
        console.error('Error from Python script:', processedData.error);
        res.status(500).json({ error: 'Error from Python script', details: processedData.error });
        return;
      }
      console.log('Sending response:', processedData); // Log the response being sent
      res.status(200).json(processedData);
    } catch (parseError) {
      console.error('Error parsing JSON output:', parseError);
      console.error('Raw output:', scriptOutput);
      res.status(500).json({ error: 'Error parsing Python script output', details: parseError.message });
    }
  });
}
