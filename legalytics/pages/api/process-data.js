// pages/api/process-data.js
import { spawn } from "child_process";
import path from "path";

export default function handler(req, res) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Validate the presence of the document_id query parameter
  const { document_id } = req.query;
  if (!document_id) {
    return res.status(400).json({ error: "Missing document_id parameter" });
  }

  // Construct the path to the Python script and spawn the process
  const pythonScriptPath = path.join(
    process.cwd(),
    "python-scripts",
    "process_data.py"
  );
  const pythonProcess = spawn("python", [pythonScriptPath, document_id]);

  // Variables to capture the output and errors from the Python script
  let scriptOutput = "";
  let scriptError = "";

  // Capture stdout output
  pythonProcess.stdout.on("data", (data) => {
    scriptOutput += data.toString();
  });

  // Capture stderr output (if any)
  pythonProcess.stderr.on("data", (data) => {
    scriptError += data.toString();
  });

  // Handle the script completion
  pythonProcess.on("close", (code) => {
    // Filter out specific TensorFlow oneDNN warnings from scriptError
    const isError =
      scriptError && !scriptError.includes("oneDNN custom operations are on");

    if (code !== 0 || isError) {
      console.error("Script execution error:", scriptError);
      return res
        .status(500)
        .json({ error: "Error executing Python script", details: scriptError });
    }

    try {
      // Attempt to parse the script output as JSON
      const processedData = JSON.parse(scriptOutput);
      res.status(200).json(processedData);
    } catch (parseError) {
      // Handle JSON parsing errors
      console.error("Error parsing processed data:", parseError);
      return res
        .status(500)
        .json({
          error: "Error parsing processed data",
          rawOutput: scriptOutput,
        });
    }
  });
}
