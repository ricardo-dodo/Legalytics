// pages/api/extraction.js

import fs from 'fs';
import { exec } from 'child_process';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req, res) {
    try {
        // Read data from data.json
        const jsonData = fs.readFileSync('./data.json', 'utf-8');
        
        // Execute extraction.py script
        exec('python ./extraction.py', (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing extraction.py: ${error}`);
                return res.status(500).json({ error: 'Internal Server Error' });
            }
            
            // Process stdout or any other data returned by extraction.py
            console.log(`Extraction script output: ${stdout}`);
            
            // Respond with extracted insights or any other relevant data
            res.status(200).json({ message: 'Insights extracted successfully' });
        });
    } catch (error) {
        console.error(`Error handling extraction API: ${error}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
