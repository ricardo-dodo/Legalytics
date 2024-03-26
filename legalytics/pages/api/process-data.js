// legalytics/pages/api/process-data.js

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export default function handler(req, res) {
  console.log('Received request:', req.method, req.query);

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
  console.log('Python script path:', pythonScriptPath);

  // Determine Python executable based on the environment
  const pythonExecutable = fs.existsSync('/usr/bin/python3') ? 'python3' : 'python';

  const pythonProcess = spawn(pythonExecutable, [pythonScriptPath, document_id]);
  console.log(`${pythonExecutable} process spawned`);

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
    res.status(500).json({ error: 'Failed to start Python script', details: error.message });
  });

  pythonProcess.on('close', (code) => {
    console.log('Python process exited with code:', code);

    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      console.error(`Error output: ${scriptError}`);
      return res.status(500).json({ error: 'Python script execution failed', details: scriptError });
    }

    try {
      const processedData = JSON.parse(scriptOutput);
      res.status(200).json(processedData);
    } catch (parseError) {
      console.error('Error parsing JSON output:', parseError);
      res.status(500).json({ error: 'Error parsing Python script output', details: parseError.message });
    }
  });
}
