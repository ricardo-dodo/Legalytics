// legalytics/pages/api/process-data.js

import { spawn } from 'child_process';
import path from 'path';
import { parse } from 'json-bigint'; // 'json-bigint' package allows safe parsing of large integers.

export default function handler(req, res) {
  console.log('Received request:', req.method, req.query); // Log the incoming request details

  // Ensure only GET requests are processed
  if (req.method !== 'GET') {
    console.error('Non-GET request made');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate the presence of a 'document_id' query parameter
  const { document_id } = req.query;
  if (!document_id) {
    console.error('Missing document_id parameter');
    return res.status(400).json({ error: 'Missing document_id parameter' });
  }

  // Define the path to the Python script
  const pythonScriptPath = path.join(process.cwd(), 'python-scripts', 'process_data.py');
  console.log('Python script path:', pythonScriptPath);

  // Spawn a child process to execute the Python script with the document_id as an argument
  const pythonProcess = spawn('python3', [pythonScriptPath, document_id]);
  console.log('Python process spawned');

  let scriptOutput = '';
  let scriptError = '';

  // Collect data from stdout
  pythonProcess.stdout.on('data', (data) => {
    console.log('Received data from Python script');
    scriptOutput += data.toString();
  });

  // Collect error information from stderr
  pythonProcess.stderr.on('data', (data) => {
    console.error('Received error from Python script');
    scriptError += data.toString();
  });

  // Handle child process errors (e.g., when the process cannot be spawned or killed)
  pythonProcess.on('error', (error) => {
    console.error('Failed to start subprocess:', error);
    res.status(500).json({ error: 'Failed to start Python script', details: error.message });
  });

  // Process script output upon completion
  pythonProcess.on('close', (code) => {
    console.log('Python process exited with code:', code);

    if (code !== 0) {
      console.error(`Python script exited with code ${code}`);
      console.error(`Error output: ${scriptError}`);
      return res.status(500).json({ error: 'Python script execution failed', details: scriptError });
    }

    try {
      // Attempt to parse the Python script's output as JSON
      const processedData = parse(scriptOutput);
      // Check for any errors reported by the Python script itself
      if (processedData.error) {
        console.error('Error from Python script:', processedData.error);
        return res.status(500).json({ error: 'Error from Python script', details: processedData.error });
      }
      // Send the processed data as a response
      res.status(200).json(processedData);
    } catch (parseError) {
      console.error('Error parsing JSON output:', parseError);
      res.status(500).json({ error: 'Error parsing Python script output', details: parseError.message });
    }
  });
}
