const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Cargar credenciales
const loadCredentials = () => {
    const credentialsEnv = process.env.GOOGLE_CREDENTIALS;
    if (!credentialsEnv) {
        console.error('No se encontró GOOGLE_CREDENTIALS en las variables de entorno.');
        process.exit(1);
    }
    try {
        return JSON.parse(credentialsEnv);
    } catch (error) {
        console.error('Error al parsear GOOGLE_CREDENTIALS:', error);
        process.exit(1);
    }
};

// Configuración de autenticación para Google Sheets
const auth = new google.auth.GoogleAuth({
    credentials: loadCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

const SPREADSHEET_ID = '1I8nFa8D_RmsoVxTYoH04mqaXshCp_DR0G6X4ez2lfYo';

// Función genérica para obtener datos de una hoja
async function getSheetData(sheetName) {
    const sheetMeta = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        fields: 'sheets(properties,data.rowData.values)',
    });
    const sheet = sheetMeta.data.sheets.find(s => s.properties.title === sheetName);
    const lastColumn = String.fromCharCode(65 + (sheet.properties.gridProperties.columnCount - 1));

    const range = `${sheetName}!A1:${lastColumn}`;
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range,
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
        throw new Error(`No se encontraron datos en la hoja ${sheetName}`);
    }

    const headers = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '_'));
    const dataRows = rows.slice(1);

    return dataRows.map(row =>
        headers.reduce((obj, header, index) => {
            obj[header] = row[index] || '';
            return obj;
        }, {})
    );
}

// Ruta para obtener departamentos
app.get('/api/departamentos', async (req, res) => {
    try {
        const departamentos = await getSheetData('Home');
        res.json(departamentos);
    } catch (error) {
        console.error('Error al obtener departamentos:', error.message);
        res.status(500).json({ error: 'Error al obtener departamentos' });
    }
});

// Ruta para obtener fotos de un departamento
app.get('/api/fotos/:id_home', async (req, res) => {
    try {
        const fotos = await getSheetData('Fotos');
        const idHome = req.params.id_home;
        const fotosDepto = fotos.filter(foto => foto.id_home === idHome);
        res.json(fotosDepto);
    } catch (error) {
        console.error('Error al obtener fotos:', error.message);
        res.status(500).json({ error: 'Error al obtener fotos' });
    }
});

// Ruta para servir imágenes de Google Drive como proxy
app.get('/proxy-image', async (req, res) => {
    const { url } = req.query;
    const defaultImage = 'https://drive.google.com/uc?export=view&id=1Jab6uk5DsW8PD6FjH_8BTyx9NxFUYfZD';

    if (!url || url.trim() === '' || !url.includes('drive.google.com')) {
        return res.redirect(`/proxy-image?url=${encodeURIComponent(defaultImage)}`);
    }

    try {
        const drivePattern = /drive\.google\.com\/(?:file\/d\/|uc\?export=view&id=|[^\/]*id=)([a-zA-Z0-9_-]+)/;
        const match = url.match(drivePattern);
        const imageId = match ? match[1] : null;

        if (!imageId) {
            return res.redirect(`/proxy-image?url=${encodeURIComponent(defaultImage)}`);
        }

        const imageUrl = `https://drive.google.com/uc?export=download&id=${imageId}`;
        const response = await axios({
            url: imageUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 10000,
        });

        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
    } catch (error) {
        console.error('Error al obtener imagen:', error.message);
        res.redirect(`/proxy-image?url=${encodeURIComponent(defaultImage)}`);
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});