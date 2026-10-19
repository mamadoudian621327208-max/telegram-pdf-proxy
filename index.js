const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.post('/upload', async (req, res) => {
    try {
        const { fileBase64, fileName } = req.body;
        if (!fileBase64 || !fileName) {
            return res.status(400).json({ error: 'Fichier ou nom manquant' });
        }

        const buffer = Buffer.from(fileBase64, 'base64');
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('document', buffer, { filename: fileName });

        const response = await axios.post(`https://api.telegram.org/bot${TOKEN}/sendDocument`, formData, {
            headers: formData.getHeaders()
        });

        const doc = response.data.result.document;
        const fileId = doc.file_id;

        const fileResponse = await axios.get(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
        const filePath = fileResponse.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;

        res.json({ success: true, url: fileUrl, file_id: fileId });
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'Erreur lors de l’envoi à Telegram' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy en écoute sur le port ${PORT}`));
