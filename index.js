const express = require('express');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');

const app = express();

// Activer CORS pour autoriser les requêtes venant de Flutter
app.use(cors());

// Augmenter la limite pour accepter les fichiers en Base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Accepte TELEGRAM_TOKEN ou TELEGRAM_BOT_TOKEN selon la configuration sur Render
const TOKEN = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Route pour les documents PDF (MISE À JOUR pour liens permanents)
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

        // Création d'une URL permanente via ton propre serveur Render (ne périme jamais)
        // Remplace "telegram-pdf-proxy.onrender.com" par le nom exact de ton application Render si besoin
        const permanentUrl = `https://telegram-pdf-proxy.onrender.com/file/${fileId}`;

        res.json({ success: true, url: permanentUrl, file_id: fileId });
    } catch (error) {
        console.error('Erreur lors de l’envoi à Telegram :', error.response?.data || error.message);
        res.status(500).json({ error: 'Erreur lors de l’envoi à Telegram' });
    }
});

// NOUVELLE ROUTE : Génère un lien valide à la volée à partir du file_id permanent
app.get('/file/:fileId', async (req, res) => {
    try {
        const fileId = req.params.fileId;
        const fileResponse = await axios.get(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
        const filePath = fileResponse.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
        
        // Redirige l'application vers le lien frais de Telegram
        res.redirect(fileUrl);
    } catch (error) {
        console.error('Erreur lors de la récupération du fichier :', error.response?.data || error.message);
        res.status(500).json({ error: 'Impossible de récupérer le fichier' });
    }
});

// Route pour l'upload des photos de profil des professeurs
app.post('/upload-photo', async (req, res) => {
    try {
        const { fileBase64, fileName } = req.body;
        if (!fileBase64) {
            return res.status(400).json({ error: 'Fichier ou nom manquant' });
        }

        const buffer = Buffer.from(fileBase64, 'base64');
        const formData = new FormData();
        formData.append('chat_id', CHAT_ID);
        formData.append('photo', buffer, { filename: fileName || 'photo.jpg' });

        const response = await axios.post(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, formData, {
            headers: formData.getHeaders()
        });

        const photos = response.data.result.photo;
        const fileId = photos[photos.length - 1].file_id;

        const fileResponse = await axios.get(`https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fileId}`);
        const filePath = fileResponse.data.result.file_path;
        const fileUrl = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;

        res.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error('Erreur lors de l’envoi de la photo à Telegram :', error.response?.data || error.message);
        res.status(500).json({ error: 'Erreur lors de l’envoi de la photo à Telegram' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy en écoute sur le port ${PORT}`));
