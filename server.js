require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
app.use(express.static('public'));

app.post('/generate-image', async (req, res) => {
    const { move, exercise, stand, steps, distance } = req.body;
    const prompt = `An abstract artwork that reflects the following activities: 
                  Move: ${move} minutes, 
                  Exercise: ${exercise} minutes, 
                  Stand: ${stand} hours, 
                  Steps: ${steps}, 
                  Distance: ${distance} km`;

    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'dall-e-2',
                prompt,
                n: 3,
                size: "512x512",
            }),
        });

        const data = await response.json();
        console.log(data);

        if (response.ok) {
            const imageUrls = data.data.map(image => image.url);
            const revisedPrompt = data.data[0].revised_prompt;
            res.json({ imageUrls, prompt, revisedPrompt });
        } else {
            console.error('OpenAI API Error:', data);
            res.status(500).json({ error: 'Failed to generate image', details: data });
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to generate image', details: error });
    }
});

app.post('/upload-csv', upload.single('csvFile'), (req, res) => {
    const filePath = req.file.path;
    const results = [];

    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            console.log('CSV data:', results);

            // CSV 파일의 첫 번째 행 데이터를 사용합니다.
            const { move, exercise, stand, steps, distance } = results[0];
            const prompt = `An abstract artwork that reflects the following activities: 
                            Move: ${move} minutes, 
                            Exercise: ${exercise} minutes, 
                            Stand: ${stand} hours, 
                            Steps: ${steps}, 
                            Distance: ${distance} km`;

            try {
                const response = await fetch('https://api.openai.com/v1/images/generations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    },
                    body: JSON.stringify({
                        model: 'dall-e-2',
                        prompt,
                        n: 3,  // CSV 파일 하나당 3개의 이미지를 생성하도록 설정
                        size: "512x512",
                    }),
                });

                const data = await response.json();
                console.log(data);

                if (response.ok) {
                    const imageUrls = data.data.map(image => image.url);
                    res.json({ imageUrls });
                } else {
                    console.error('OpenAI API Error:', data);
                    res.status(500).json({ error: 'Failed to generate image', details: data });
                }
            } catch (error) {
                console.error('Error:', error);
                res.status(500).json({ error: 'Failed to generate image', details: error });
            }

            fs.unlinkSync(filePath); // CSV 파일 삭제
        });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
