import React, { useState, useEffect } from 'react';
import { scaleLinear } from '@visx/scale';
import axios from 'axios';

// Import necessary visx components
import { Wordcloud } from '@visx/wordcloud';

const WordCloud = ({ backendUrl }) => {
  const [words, setWords] = useState([]);

  useEffect(() => {
    // Assuming your frontend sends a POST request with a document ID
    // Update with the correct endpoint and adjust the payload as needed
    const fetchWordCloudData = async () => {
      try {
        const response = await axios.post(`${backendUrl}/process_data`, { document_id: '66-pmk.02-2013' });

        // Adjust based on the actual response structure
        const wordCloudData = response.data.wordCloud; 
        setWords(wordCloudData.map(d => ({
          ...d,
          text: d.text,
          value: d.value * 1000, // Scale value as needed for better visualization
        })));
      } catch (error) {
        console.error('Error fetching word cloud data:', error);
      }
    };

    fetchWordCloudData();
  }, [backendUrl]);

  const fontSizeMapper = scaleLinear({
    domain: [0, Math.max(...words.map(d => d.value))],
    range: [10, 100],
  });

  return (
    <div>
      <svg width="100%" height="400" viewBox="0 0 400 400">
        <rect width="100%" height="100%" fill="#fafafa" />
        <Wordcloud
          words={words}
          width={400}
          height={400}
          fontSize={d => fontSizeMapper(d.value)}
          font={'Impact'}
          fontWeight={400}
          fontStyle={'normal'}
          rotate={d => d.value % 360}
          spiral="archimedean"
          random={() => 0.5}
        >
          {cloudWords =>
            cloudWords.map((word, index) => (
              <text
                key={index}
                fill="#333"
                textAnchor="middle"
                transform={`translate(${word.x}, ${word.y}) rotate(${word.rotate})`}
                fontSize={`${word.size}px`}
                style={{ fontFamily: word.font }}
              >
                {word.text}
              </text>
            ))
          }
        </Wordcloud>
      </svg>
    </div>
  );
};

export default WordCloud;
