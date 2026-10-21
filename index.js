const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');

const app = express();

// Activer CORS pour autoriser les requêtes venant de Flutter
app.use(cors());

// Augmenter la limite pour accepter les fichiers PDF en Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Accepte TELEGRAM_TOKEN ou TELEGRAM_BOT_TOKEN selon la configuration sur Render
const TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.post('/upload', async (req, res) => {
    try {
        const { fileBase64, fileName } = req.body;
        if (!fileBase64 || !fileName) {
            return res.status(400).json({ error: 'Fichier ou nom manquant' });
        }

        // Convertir le fichier Base64 en Buffer binaire
        const buffer = Buffer.from(fileBase64, 'base64');
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('document', buffer, { filename: fileName });

        // 1. Envoyer le document au canal Telegram
        const response = await axios.post(`https://api.telegram.org/bot${TOKEN}/sendDocument`, formData, {
            headers: formData.getHeaders()
        });

        const doc = response.data.result.document;
        const fileId = doc.file_id;

        // 2. Récupérer le chemin pour générer l'URL de téléchargement direct
        const fileResponse = await axios.get(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
        const filePath = fileResponse.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;

        // 3. Renvoyer l'URL du fichier à Flutter
        res.json({ success: true, url: fileUrl, file_id: fileId });
    } catch (error) {
        console.error('Erreur lors de l’envoi à Telegram :', error.response?.data || error.message);
        res.status(500).json({ error: 'Erreur lors de l’envoi à Telegram' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy en écoute sur le port ${PORT}`));
